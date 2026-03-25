import { describe, expect, test } from 'vitest';
import type {
  BrokerClient,
  BrokerDataManager,
  OrderSyncState,
  OrderSyncStateManager,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { createSyncHistoricalOrders } from '../sync-historical-orders';

const baseRateLimit = {
  rateLimitLimit: 10,
  rateLimitPeriodSec: 60,
  rateLimitRemaining: 9,
  rateLimitResetEpoch: 0,
  rateLimitUsed: 1,
};

const createClient = (
  overrides: Partial<BrokerClient> = {},
): BrokerClient => ({
  fetchAccountCash: () => okAsync({} as never),
  fetchAccountSummary: () => okAsync({} as never),
  fetchHistoricalOrders: () => okAsync({ items: [], nextPagePath: null }),
  ...overrides,
});

describe('syncHistoricalOrders', () => {
  test('clears nextPagePath when post-backfill run is in sync', async () => {
    let persistedState: OrderSyncState | undefined;

    const syncStateManager: OrderSyncStateManager = {
      getState: () =>
        okAsync({
          nextPagePath: '/api/v0/equity/history/orders?limit=50',
          backfillCompleted: true,
          ...baseRateLimit,
        }),
      setState: (state) => {
        persistedState = state;
        return okAsync(undefined);
      },
    };

    const dataManager: BrokerDataManager = {
      getHistoricalOrders: () => okAsync([]),
      getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
      getDistinctInstruments: () => okAsync([]),
      saveHistoricalOrders: () => okAsync(0),
      saveInstrumentPriceSource: () => okAsync(undefined),
      getInstrumentPriceSourceByIsin: () => okAsync(undefined),
      saveInstrumentPriceSnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: () => okAsync(undefined),
      listInstrumentsNeedingPriceRefresh: () => okAsync([]),
    };

    const syncHistoricalOrders = createSyncHistoricalOrders({
      client: createClient(),
      dataManager,
      syncStateManager,
    });

    const result = await syncHistoricalOrders();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe('in_sync');
    }
    expect(persistedState?.nextPagePath).toBeNull();
  });

  test('returns rate_limited when the client returns RATE_LIMIT', async () => {
    let persistedState: OrderSyncState | undefined;

    const syncStateManager: OrderSyncStateManager = {
      getState: () =>
        okAsync({
          nextPagePath: '/api/v0/equity/history/orders?limit=50',
          backfillCompleted: false,
          ...baseRateLimit,
        }),
      setState: (state) => {
        persistedState = state;
        return okAsync(undefined);
      },
    };

    const dataManager: BrokerDataManager = {
      getHistoricalOrders: () => okAsync([]),
      getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
      getDistinctInstruments: () => okAsync([]),
      saveHistoricalOrders: () => okAsync(0),
      saveInstrumentPriceSource: () => okAsync(undefined),
      getInstrumentPriceSourceByIsin: () => okAsync(undefined),
      saveInstrumentPriceSnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: () => okAsync(undefined),
      listInstrumentsNeedingPriceRefresh: () => okAsync([]),
    };

    const syncHistoricalOrders = createSyncHistoricalOrders({
      client: createClient({
        fetchHistoricalOrders: () =>
          errAsync({
            code: 'RATE_LIMIT',
            message: 'Too many requests',
            rateLimitResponse: {
              rateLimitLimit: 10,
              rateLimitPeriodSec: 60,
              rateLimitRemaining: 0,
              rateLimitResetEpoch: 123,
              rateLimitUsed: 10,
            },
          }),
      }),
      dataManager,
      syncStateManager,
    });

    const result = await syncHistoricalOrders();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe('rate_limited');
    }
    expect(persistedState?.rateLimitRemaining).toBe(0);
    expect(persistedState?.nextPagePath).toBe(
      '/api/v0/equity/history/orders?limit=50',
    );
  });
});
