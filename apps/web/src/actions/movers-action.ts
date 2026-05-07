'use server';

import {
  getAppCapabilities,
  getCurrentHoldingMovers,
} from '@/lib/server/composition';
import { parseQueryDate } from '@/lib/client/orders/orders-view-url-state';

async function getMoversAction(params?: {
  filledFrom?: string;
  filledTo?: string;
}) {
  const filledFrom = parseQueryDate(params?.filledFrom)
    ? params?.filledFrom
    : undefined;
  const filledTo = parseQueryDate(params?.filledTo)
    ? params?.filledTo
    : undefined;

  const [capabilitiesResult, moversResult] = await Promise.all([
    getAppCapabilities(),
    getCurrentHoldingMovers({ filledFrom, filledTo }),
  ]);

  if (capabilitiesResult.isErr()) {
    throw new Error(capabilitiesResult.error.message);
  }

  if (moversResult.isErr()) {
    throw new Error(moversResult.error.message);
  }

  return {
    capabilities: capabilitiesResult.value,
    movers: moversResult.value,
  };
}

export { getMoversAction };
