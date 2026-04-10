'use server';

import { syncPortfolioState } from '@/lib/server/composition';
import type { OrdersSyncActionResult } from './sync-action-types';

export async function syncPortfolioStateAction(): Promise<OrdersSyncActionResult> {
  const result = await syncPortfolioState();

  if (result.isErr()) {
    console.warn('portfolio-state sync failed', result.error);
    return {
      ok: false,
      kind: 'portfolio-state',
      message: 'Portfolio state sync failed.',
    };
  }

  return {
    ok: true,
    kind: 'portfolio-state',
    message: 'Portfolio state synced.',
  };
}
