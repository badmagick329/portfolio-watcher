'use server';

import { syncPortfolioState } from '@/lib/server/composition';

export async function syncPortfolioStateAction() {
  const result = await syncPortfolioState();

  if (result.isErr()) {
    console.warn('portfolio-state sync failed', result.error);
    return { ok: false as const };
  }

  return { ok: true as const };
}
