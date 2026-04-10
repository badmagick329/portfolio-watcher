'use server';

import { syncHistoricalOrders } from '@/lib/server/composition';
import type { OrdersSyncActionResult } from './sync-action-types';

export async function syncOrdersAction(): Promise<OrdersSyncActionResult> {
  const result = await syncHistoricalOrders();

  if (result.isErr()) {
    console.warn('historical-orders sync failed', result.error);
    return {
      ok: false,
      kind: 'orders',
      message: 'Orders sync failed.',
    };
  }

  return {
    ok: true,
    kind: 'orders',
    message: 'Orders synced.',
  };
}
