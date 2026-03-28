import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth/guards';

export default async function InversorLayout({ children }: { children: ReactNode }) {
  await requireRole('inversor');
  return children;
}
