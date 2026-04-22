'use server';

import { syncT212InstrumentCatalog } from '@/lib/server/composition';
import type { OrdersSyncActionResult } from './sync-action-types';
import { toFailedSyncActionResult } from './sync-action-message';

export async function syncInstrumentsAction(): Promise<OrdersSyncActionResult> {
  const result = await syncT212InstrumentCatalog();

  if (result.isErr()) {
    console.warn('instrument-catalog sync failed', result.error);
    return toFailedSyncActionResult('instruments', result.error);
  }

  return {
    ok: true,
    kind: 'instruments',
    message: 'Instruments synced.',
  };
}
