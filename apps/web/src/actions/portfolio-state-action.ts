'use server';

import { syncPortfolioState } from '@/lib/server/composition';
import type { OrdersSyncActionResult } from './sync-action-types';
import { toFailedSyncActionResult } from './sync-action-message';

export async function syncPortfolioStateAction(): Promise<OrdersSyncActionResult> {
  const result = await syncPortfolioState();

  if (result.isErr()) {
    console.warn('portfolio-state sync failed', result.error);
    return toFailedSyncActionResult('portfolio-state', result.error);
  }

  return {
    ok: true,
    kind: 'portfolio-state',
    message: 'Portfolio state synced.',
  };
}
