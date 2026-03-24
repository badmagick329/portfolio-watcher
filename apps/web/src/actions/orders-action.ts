'use server';

import type { WebHistoricalOrdersFilters } from '@portfolio/domain';
import {
  getDistinctInstruments,
  getHistoricalOrdersForWeb,
} from '@/lib/server/composition';

export async function getOrdersAction(
  filters: WebHistoricalOrdersFilters = {},
) {
  const result = await getHistoricalOrdersForWeb(filters);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getInstrumentsAction() {
  const result = await getDistinctInstruments();

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
