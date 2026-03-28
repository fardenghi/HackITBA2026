import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth/guards';

export default async function CedenteLayout({ children }: { children: ReactNode }) {
  await requireRole('cedente');
  return children;
}
