import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks = {
    runtime: true,
    supabase: false,
  };

  if (url && serviceRoleKey) {
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    checks.supabase = !error;
  }

  const ok = checks.runtime && checks.supabase;

  return Response.json(
    {
      ok,
      phase: '01-foundation-auth',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
