import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { AuthRole } from '@/lib/auth/types';

const protectedRolePrefixes: Record<string, AuthRole> = {
  '/cedente': 'cedente',
  '/inversor': 'inversor',
};

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function getDashboardPath(role: AuthRole) {
  return role === 'cedente' ? '/cedente/dashboard' : '/inversor/dashboard';
}

function getRequiredRole(pathname: string) {
  return Object.entries(protectedRolePrefixes).find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRole(pathname);

  if (!user && requiredRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: AuthRole }>();

  const role = profile?.role ?? (user.user_metadata?.role as AuthRole | undefined);

  if (requiredRole && role && role !== requiredRole) {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if ((pathname === '/login' || pathname === '/signup') && role) {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ['/login', '/signup', '/cedente/:path*', '/inversor/:path*'],
};
