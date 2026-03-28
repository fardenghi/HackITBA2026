'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceInvoiceCard } from '@/lib/marketplace/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type MarketplaceRealtimeMode = 'connecting' | 'live' | 'polling';

export type MarketplaceInvoicePatch = {
  id: string;
  fundedFractions: number;
  totalFractions: number;
  status: 'funding' | 'funded';
};

type IntervalHandle = ReturnType<typeof globalThis.setInterval>;
type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

type SubscribeHandlers = {
  onStatusChange: (status: string) => void;
  onInvoiceUpdate: (patch: MarketplaceInvoicePatch) => void;
};

type MarketplaceRealtimeControllerOptions = {
  initialInvoices: MarketplaceInvoiceCard[];
  refresh: () => Promise<MarketplaceInvoiceCard[]>;
  onInvoicesChange: (next: MarketplaceInvoiceCard[]) => void;
  onModeChange: (mode: MarketplaceRealtimeMode) => void;
  subscribeToInvoices: (handlers: SubscribeHandlers) => () => void;
  setIntervalFn?: (callback: () => void, delay: number) => IntervalHandle;
  clearIntervalFn?: (handle: IntervalHandle) => void;
  setTimeoutFn?: (callback: () => void, delay: number) => TimeoutHandle;
  clearTimeoutFn?: (handle: TimeoutHandle) => void;
  fallbackDelayMs?: number;
};

type UseMarketplaceRealtimeOptions = {
  initialInvoices: MarketplaceInvoiceCard[];
  refresh: () => Promise<MarketplaceInvoiceCard[]>;
};

function isLiveStatus(status: string) {
  return status === 'SUBSCRIBED';
}

function isPollingFallbackStatus(status: string) {
  return ['CHANNEL_ERROR', 'CLOSED', 'TIMED_OUT'].includes(status);
}

export function patchMarketplaceInvoices(
  invoices: MarketplaceInvoiceCard[],
  patch: MarketplaceInvoicePatch,
): MarketplaceInvoiceCard[] {
  return invoices.map((invoice) => {
    if (invoice.id !== patch.id) {
      return invoice;
    }

    const availableFractions = Math.max(patch.totalFractions - patch.fundedFractions, 0);

    return {
      ...invoice,
      fundedFractions: patch.fundedFractions,
      totalFractions: patch.totalFractions,
      availableFractions,
    };
  });
}

const defaultSetInterval = (callback: () => void, delay: number) => globalThis.setInterval(callback, delay);
const defaultClearInterval = (handle: IntervalHandle) => globalThis.clearInterval(handle);
const defaultSetTimeout = (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay);
const defaultClearTimeout = (handle: TimeoutHandle) => globalThis.clearTimeout(handle);

export function createMarketplaceRealtimeController<TInvoice extends MarketplaceInvoiceCard>({
  initialInvoices,
  refresh,
  onInvoicesChange,
  onModeChange,
  subscribeToInvoices,
  setIntervalFn = defaultSetInterval,
  clearIntervalFn = defaultClearInterval,
  setTimeoutFn = defaultSetTimeout,
  clearTimeoutFn = defaultClearTimeout,
  fallbackDelayMs = 2000,
}: {
  initialInvoices: TInvoice[];
  refresh: () => Promise<TInvoice[]>;
  onInvoicesChange: (next: TInvoice[]) => void;
  onModeChange: (mode: MarketplaceRealtimeMode) => void;
  subscribeToInvoices: (handlers: SubscribeHandlers) => () => void;
  setIntervalFn?: (callback: () => void, delay: number) => IntervalHandle;
  clearIntervalFn?: (handle: IntervalHandle) => void;
  setTimeoutFn?: (callback: () => void, delay: number) => TimeoutHandle;
  clearTimeoutFn?: (handle: TimeoutHandle) => void;
  fallbackDelayMs?: number;
}) {
  let invoices = initialInvoices;
  let unsubscribe: () => void = () => {};
  let pollingHandle: IntervalHandle | null = null;
  let fallbackTimeoutHandle: TimeoutHandle | null = null;

  async function runRefresh() {
    const next = await refresh();
    invoices = next;
    onInvoicesChange(next);
  }

  function stopPolling() {
    if (pollingHandle !== null) {
      clearIntervalFn(pollingHandle);
      pollingHandle = null;
    }
  }

  function clearFallbackTimeout() {
    if (fallbackTimeoutHandle !== null) {
      clearTimeoutFn(fallbackTimeoutHandle);
      fallbackTimeoutHandle = null;
    }
  }

  function startPolling() {
    clearFallbackTimeout();

    if (pollingHandle !== null) {
      return;
    }

    onModeChange('polling');
    pollingHandle = setIntervalFn(() => {
      void runRefresh();
    }, 2000);
  }

  return {
    start() {
      onModeChange('connecting');
      fallbackTimeoutHandle = setTimeoutFn(() => {
        startPolling();
      }, fallbackDelayMs);

      unsubscribe = subscribeToInvoices({
        onStatusChange(status) {
          if (isLiveStatus(status)) {
            clearFallbackTimeout();
            stopPolling();
            onModeChange('live');
            return;
          }

          if (isPollingFallbackStatus(status)) {
            startPolling();
          }
        },
        onInvoiceUpdate(patch) {
          invoices = patchMarketplaceInvoices(invoices, patch) as TInvoice[];
          onInvoicesChange(invoices as TInvoice[]);
        },
      });
    },
    stop() {
      clearFallbackTimeout();
      unsubscribe();
      stopPolling();
    },
  };
}

function buildInvoiceSubscription(
  supabase: SupabaseClient,
  handlers: SubscribeHandlers,
): RealtimeChannel {
  return supabase
    .channel('marketplace-invoices')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
      const row = payload.new as Record<string, unknown> | null;

      if (!row?.id || (row.status !== 'funding' && row.status !== 'funded')) {
        return;
      }

      handlers.onInvoiceUpdate({
        id: String(row.id),
        fundedFractions: Number(row.funded_fractions ?? 0),
        totalFractions: Number(row.total_fractions ?? 0),
        status: row.status === 'funded' ? 'funded' : 'funding',
      });
    })
    .subscribe((status) => handlers.onStatusChange(status));
}

export function useMarketplaceRealtime<TInvoice extends MarketplaceInvoiceCard>({
  initialInvoices,
  refresh,
}: {
  initialInvoices: TInvoice[];
  refresh: () => Promise<TInvoice[]>;
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [mode, setMode] = useState<MarketplaceRealtimeMode>('connecting');

  const refreshStable = useMemo(() => refresh, [refresh]);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const controller = createMarketplaceRealtimeController({
      initialInvoices,
      refresh: refreshStable,
      onInvoicesChange: setInvoices,
      onModeChange: setMode,
      subscribeToInvoices: (handlers) => {
        const channel = buildInvoiceSubscription(supabase, handlers);

        return () => {
          void supabase.removeChannel(channel);
        };
      },
    });

    controller.start();

    return () => controller.stop();
  }, [initialInvoices, refreshStable]);

  return {
    invoices,
    mode,
  };
}
