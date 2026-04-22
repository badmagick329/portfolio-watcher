'use server';

import { syncHistoricalOrders } from '@/lib/server/composition';
import type { OrdersSyncActionResult } from './sync-action-types';
import { toFailedSyncActionResult } from './sync-action-message';

export async function syncOrdersAction(): Promise<OrdersSyncActionResult> {
  const result = await syncHistoricalOrders();

  if (result.isErr()) {
    console.warn('historical-orders sync failed', result.error);
    return toFailedSyncActionResult('orders', result.error);
  }

  return {
    ok: true,
    kind: 'orders',
    message: 'Orders synced.',
  };
}
