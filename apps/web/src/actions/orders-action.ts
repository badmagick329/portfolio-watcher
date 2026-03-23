'use server';

import type { WebHistoricalOrdersFilters } from '@portfolio/domain';
import { getHistoricalOrdersForWeb } from '@/lib/composition';

export async function getOrdersAction(
  filters: WebHistoricalOrdersFilters = {},
) {
  const result = await getHistoricalOrdersForWeb(filters);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
