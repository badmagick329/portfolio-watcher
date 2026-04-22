'use server';

import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '@/lib/client/portfolio/instrument-price';
import type { OrdersExplorerData } from '@/lib/client/orders/orders-explorer-data';
import {
  getAppCapabilities,
  getDistinctInstruments,
  getHistoricalOrdersForWeb,
  getLatestAccountSummarySnapshot,
  getLatestCurrentPositionSnapshot,
  getLatestInstrumentPrice,
} from '@/lib/server/composition';

export async function getOrdersExplorerDataAction(): Promise<OrdersExplorerData> {
  const [orders, instruments, latestAccountSummarySnapshotResult, capabilitiesResult] =
    await Promise.all([
      getOrders(),
      getDistinctInstrumentsForExplorer(),
      getLatestAccountSummarySnapshot(),
      getAppCapabilities(),
    ]);

  if (latestAccountSummarySnapshotResult.isErr()) {
    throw new Error(latestAccountSummarySnapshotResult.error.message);
  }

  const latestAccountSummarySnapshot: AccountSummarySnapshot | null =
    latestAccountSummarySnapshotResult.value ?? null;

  if (capabilitiesResult.isErr()) {
    throw new Error(capabilitiesResult.error.message);
  }
  const instrumentsWithStoredPrices = await Promise.all(
    instruments.map(async (instrument) => {
      const [latestStoredPriceResult, latestPositionSnapshotResult] =
        await Promise.all([
          getLatestInstrumentPrice(instrument.isin),
          getLatestCurrentPositionSnapshot(instrument.isin),
        ]);

      if (latestStoredPriceResult.isErr()) {
        throw new Error(latestStoredPriceResult.error.message);
      }

      if (latestPositionSnapshotResult.isErr()) {
        throw new Error(latestPositionSnapshotResult.error.message);
      }

      return {
        ...instrument,
        latestStoredPrice: latestStoredPriceResult.value
          ? {
              provider: latestStoredPriceResult.value.provider,
              price: latestStoredPriceResult.value.price,
              currency: latestStoredPriceResult.value.currency,
              asOf: latestStoredPriceResult.value.asOf,
              priceType: latestStoredPriceResult.value.priceType,
            }
          : null,
        latestPositionSnapshot: latestPositionSnapshotResult.value ?? null,
      } satisfies InstrumentWithStoredPrice;
    }),
  );

  return {
    capabilities: capabilitiesResult.value,
    instruments: instrumentsWithStoredPrices,
    latestAccountSummarySnapshot,
    orders: orders.items.toSorted(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    ),
  };
}

async function getOrders() {
  const result = await getHistoricalOrdersForWeb();

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

async function getDistinctInstrumentsForExplorer() {
  const result = await getDistinctInstruments();

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
