import { NextResponse } from 'next/server';
import { buildContractProbeReport, getBcraSnapshot } from '@/lib/risk/bcra';

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const { searchParams } = new URL(request.url);
  const cuit = searchParams.get('cuit') ?? '30712345678';

  if (resource === 'contract') {
    const report = await buildContractProbeReport(cuit);
    return NextResponse.json(report);
  }

  const snapshot = await getBcraSnapshot(cuit);

  if (resource === 'snapshot') {
    return NextResponse.json(snapshot);
  }

  return NextResponse.json(
    {
      error: 'Unsupported BCRA diagnostic resource.',
      supported: ['contract', 'snapshot'],
    },
    { status: 404 },
  );
}
