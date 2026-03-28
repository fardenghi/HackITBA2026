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
  setIntervalFn?: typeof window.setInterval;
  clearIntervalFn?: typeof window.clearInterval;
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

export function createMarketplaceRealtimeController({
  initialInvoices,
  refresh,
  onInvoicesChange,
  onModeChange,
  subscribeToInvoices,
  setIntervalFn = window.setInterval.bind(window),
  clearIntervalFn = window.clearInterval.bind(window),
}: MarketplaceRealtimeControllerOptions) {
  let invoices = initialInvoices;
  let unsubscribe: () => void = () => {};
  let pollingHandle: number | null = null;

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

  function startPolling() {
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
      unsubscribe = subscribeToInvoices({
        onStatusChange(status) {
          if (isLiveStatus(status)) {
            stopPolling();
            onModeChange('live');
            return;
          }

          if (isPollingFallbackStatus(status)) {
            startPolling();
          }
        },
        onInvoiceUpdate(patch) {
          invoices = patchMarketplaceInvoices(invoices, patch);
          onInvoicesChange(invoices);
        },
      });
    },
    stop() {
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

export function useMarketplaceRealtime({ initialInvoices, refresh }: UseMarketplaceRealtimeOptions) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [mode, setMode] = useState<MarketplaceRealtimeMode>('connecting');

  const refreshStable = useMemo(() => refresh, [refresh]);

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
