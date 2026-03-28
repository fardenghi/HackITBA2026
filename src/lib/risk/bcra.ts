import { createClient } from '@supabase/supabase-js';
import { normalizeBcraSnapshot, type NormalizedBcraSnapshot } from '@/lib/risk/normalize';

export type BcraResource = 'deudores' | 'historicas' | 'cheques';

export type BcraCacheRow = {
  cuit: string;
  deudores_data: unknown;
  historicas_data: unknown;
  cheques_data: unknown;
  fetched_at: string;
  expires_at: string;
};

export type BcraSnapshotResult = {
  source: 'cache' | 'live' | 'stale-cache' | 'fallback';
  snapshot: NormalizedBcraSnapshot;
  raw: {
    deudores: unknown;
    historicas: unknown;
    cheques: unknown;
  };
};

type ProbeResourceResult = {
  resource: BcraResource;
  reachable: boolean;
  status: number;
  matchedPath: string | null;
  attemptedPaths: string[];
  contentType: string | null;
};

type FetchLike = typeof fetch;

type BcraDependencies = {
  fetchImpl?: FetchLike;
  readCache?: (cuit: string) => Promise<BcraCacheRow | null>;
  writeCache?: (payload: BcraCacheRow) => Promise<void>;
  timeoutMs?: number;
  baseUrl?: string;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_BASE_URL = process.env.BCRA_API_BASE_URL ?? 'https://api.bcra.gob.ar/centraldedeudores/v1.0';

const resourceCandidates: Record<BcraResource, string[]> = {
  deudores: ['/deudores', '/situacion'],
  historicas: ['/historicas', '/historico'],
  cheques: ['/cheques', '/chequesrechazados'],
};

function normalizeCuit(value: string) {
  return value.replace(/\D/g, '');
}

function buildUrl(baseUrl: string, path: string, cuit: string) {
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('cuit', cuit);
  return url.toString();
}

function isFresh(row: BcraCacheRow) {
  return new Date(row.expires_at).getTime() > Date.now();
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables for BCRA cache access.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function defaultReadCache(cuit: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.from('bcra_cache').select('*').eq('cuit', cuit).maybeSingle<BcraCacheRow>();
  if (error) throw error;
  return data;
}

async function defaultWriteCache(row: BcraCacheRow) {
  const admin = getAdminClient();
  const { error } = await admin.from('bcra_cache').upsert(row, { onConflict: 'cuit' });
  if (error) throw error;
}

async function fetchJson(url: string, fetchImpl: FetchLike, timeoutMs: number) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type');
  let body: unknown = null;

  try {
    body = contentType?.includes('json') ? await response.json() : await response.text();
  } catch {
    body = null;
  }

  return { response, body, contentType };
}

async function probeResource(resource: BcraResource, cuit: string, deps: Required<Pick<BcraDependencies, 'fetchImpl' | 'timeoutMs' | 'baseUrl'>>) {
  const attemptedPaths: string[] = [];

  for (const path of resourceCandidates[resource]) {
    attemptedPaths.push(path);
    const url = buildUrl(deps.baseUrl, path, cuit);

    try {
      const { response, contentType } = await fetchJson(url, deps.fetchImpl, deps.timeoutMs);
      if (response.ok) {
        return {
          resource,
          reachable: true,
          status: response.status,
          matchedPath: path,
          attemptedPaths,
          contentType,
        } satisfies ProbeResourceResult;
      }

      if (response.status !== 404) {
        return {
          resource,
          reachable: false,
          status: response.status,
          matchedPath: path,
          attemptedPaths,
          contentType,
        } satisfies ProbeResourceResult;
      }
    } catch {
      return {
        resource,
        reachable: false,
        status: 0,
        matchedPath: path,
        attemptedPaths,
        contentType: null,
      } satisfies ProbeResourceResult;
    }
  }

  return {
    resource,
    reachable: false,
    status: 404,
    matchedPath: null,
    attemptedPaths,
    contentType: null,
  } satisfies ProbeResourceResult;
}

async function fetchResourcePayload(resource: BcraResource, cuit: string, deps: Required<Pick<BcraDependencies, 'fetchImpl' | 'timeoutMs' | 'baseUrl'>>) {
  for (const path of resourceCandidates[resource]) {
    const url = buildUrl(deps.baseUrl, path, cuit);

    try {
      const { response, body } = await fetchJson(url, deps.fetchImpl, deps.timeoutMs);
      if (response.ok) {
        return { path, body };
      }
    } catch {
      return { path, body: null };
    }
  }

  return { path: null, body: null };
}

export function normalizeBcraSnapshotFromCache(row: Pick<BcraCacheRow, 'cuit' | 'deudores_data' | 'historicas_data' | 'cheques_data'>) {
  return normalizeBcraSnapshot({
    cuit: row.cuit,
    deudores: row.deudores_data,
    historicas: row.historicas_data,
    cheques: row.cheques_data,
  });
}

export async function getBcraSnapshot(cuitInput: string, deps: BcraDependencies = {}): Promise<BcraSnapshotResult> {
  const cuit = normalizeCuit(cuitInput);
  const readCache = deps.readCache ?? defaultReadCache;
  const writeCache = deps.writeCache ?? defaultWriteCache;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = deps.baseUrl ?? DEFAULT_BASE_URL;
  const cacheRow = await readCache(cuit);

  if (cacheRow && isFresh(cacheRow)) {
    return {
      source: 'cache',
      snapshot: normalizeBcraSnapshotFromCache(cacheRow),
      raw: {
        deudores: cacheRow.deudores_data,
        historicas: cacheRow.historicas_data,
        cheques: cacheRow.cheques_data,
      },
    };
  }

  const [deudores, historicas, cheques] = await Promise.all([
    fetchResourcePayload('deudores', cuit, { fetchImpl, timeoutMs, baseUrl }),
    fetchResourcePayload('historicas', cuit, { fetchImpl, timeoutMs, baseUrl }),
    fetchResourcePayload('cheques', cuit, { fetchImpl, timeoutMs, baseUrl }),
  ]);

  if (deudores.body || historicas.body || cheques.body) {
    const row: BcraCacheRow = {
      cuit,
      deudores_data: deudores.body,
      historicas_data: historicas.body,
      cheques_data: cheques.body,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await writeCache(row);

    return {
      source: 'live',
      snapshot: normalizeBcraSnapshotFromCache(row),
      raw: {
        deudores: row.deudores_data,
        historicas: row.historicas_data,
        cheques: row.cheques_data,
      },
    };
  }

  if (cacheRow) {
    return {
      source: 'stale-cache',
      snapshot: normalizeBcraSnapshotFromCache(cacheRow),
      raw: {
        deudores: cacheRow.deudores_data,
        historicas: cacheRow.historicas_data,
        cheques: cacheRow.cheques_data,
      },
    };
  }

  return {
    source: 'fallback',
    snapshot: normalizeBcraSnapshot({ cuit, deudores: null, historicas: null, cheques: null }),
    raw: { deudores: null, historicas: null, cheques: null },
  };
}

export async function buildContractProbeReport(cuitInput: string, deps: BcraDependencies = {}) {
  const cuit = normalizeCuit(cuitInput);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = deps.baseUrl ?? DEFAULT_BASE_URL;
  const resources = await Promise.all(
    (Object.keys(resourceCandidates) as BcraResource[]).map((resource) =>
      probeResource(resource, cuit, { fetchImpl, timeoutMs, baseUrl }),
    ),
  );

  return {
    checkedAt: new Date().toISOString(),
    cuit,
    baseUrl,
    resources,
  };
}

export { normalizeBcraSnapshot };
