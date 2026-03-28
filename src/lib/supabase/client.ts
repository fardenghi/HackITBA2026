import { createBrowserClient } from '@supabase/ssr';

function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing public Supabase environment variables.');
  }

  return { url, key };
}

export function createSupabaseBrowserClient() {
  const { url, key } = getPublicEnv();
  return createBrowserClient(url, key);
}
