import { redirect } from 'next/navigation';
import { getCurrentAuthState, getDashboardPathForRole } from '@/lib/auth/session';
import type { AuthRole } from '@/lib/auth/types';

export async function requireRole(expectedRole: AuthRole) {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect('/login');
  }

  if (!profile) {
    redirect('/login');
  }

  if (profile.role !== expectedRole) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return { user, profile };
}
