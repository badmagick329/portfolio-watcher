import type {
  BrokerClient,
  BrokerClientWithCache,
  BrokerDataManager,
} from '@/core/broker-client';
import type { Cache } from '@/core/cache';
import type {
  OrderSyncState,
  OrderSyncStateManager,
} from '@/core/order-sync-state';
import { endPoints } from '@/infra/trading212-client/end-points';
import type { FetchParams } from '@/infra/trading212-client/types';
import {
  fetchRequest,
  fetchRequestWithRateLimit,
} from '@/infra/trading212-client/utils';
import type { AppError, HistoricalOrdersParams } from '@/types';
import {
  type HistoricalOrders,
  accountCashSchema,
  accountSummarySchema,
  historicalOrdersSchema,
} from '@/types/schemas/api-responses';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';

const createTrading212Client = (
  syncStateManager: OrderSyncStateManager,
  brokerDataManager: BrokerDataManager,
) => {
  const creds = Buffer.from(
    `${process.env.API_KEY}:${process.env.API_SECRET}`,
    'utf-8',
  ).toBase64();

  const fetchAccountCash = () =>
    fetchRequest({
      endPoint: endPoints.accountCash,
      schema: accountCashSchema,
      creds,
    });

  const fetchAccountSummary = () =>
    fetchRequest({
      endPoint: endPoints.accountSummary,
      schema: accountSummarySchema,
      creds,
    });

  const fetchHistoricalOrders = (params: HistoricalOrdersParams) =>
    fetchRequest({
      endPoint: endPoints.historicalOrders(params),
      schema: historicalOrdersSchema,
      creds,
    });
  const syncHistoricalOrders = () =>
    syncStateManager
      .getState()
      .andThen(
        (
          state,
        ): ResultAsync<
          {
            state?: OrderSyncState;
            params: FetchParams<HistoricalOrders>;
          },
          AppError
        > => {
          if (state?.rateLimitRemaining === 0) {
            const date = new Date(state.rateLimitResetEpoch * 1000);
            if (date > new Date()) {
              return errAsync({
                code: 'RATE_LIMIT',
                message: `Rate limit reached, try again later at ${date.toLocaleString()}`,
              });
            }
          }
          // Rate limit should've reset, continue

          let nextPagePath = undefined;
          if (state && !state.backfillCompleted && state.backfillNextPagePath) {
            nextPagePath = state.backfillNextPagePath;
          }
          if (nextPagePath === undefined) {
            return okAsync({
              state,
              params: {
                endPoint: endPoints.historicalOrders({ limit: '50' }),
                schema: historicalOrdersSchema,
                creds,
              },
            });
          }

          return okAsync({
            state,
            params: {
              endPoint: nextPagePath,
              schema: historicalOrdersSchema,
              creds,
            },
          });
        },
      )
      .andThen(({ params, state }) =>
        fetchRequestWithRateLimit({
          endPoint: params.endPoint,
          schema: params.schema,
          creds: params.creds,
        }).andThen(({ data, rateLimitResponse }) => {
          let nextState: OrderSyncState;

          if (data !== undefined) {
            nextState = {
              backfillNextPagePath: data.nextPagePath,
              backfillCompleted: data.nextPagePath === null,
              ...rateLimitResponse,
            };
          } else if (state) {
            nextState = {
              backfillNextPagePath: state.backfillNextPagePath,
              backfillCompleted: state.backfillCompleted,
              ...rateLimitResponse,
            };
          } else {
            // this should technically never happen?
            nextState = {
              backfillNextPagePath: endPoints.historicalOrders({
                limit: '50',
              }),
              backfillCompleted: false,
              ...rateLimitResponse,
            };
          }

          const saveDataResult = data?.items
            ? brokerDataManager.saveHistoricalOrders(data.items)
            : okAsync(undefined);

          return saveDataResult
            .andThen(() => syncStateManager.setState(nextState))
            .map(() => nextState);
        }),
      );

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    syncHistoricalOrders,
    endPoints,
  } satisfies BrokerClient;
};

const createTrading212ClientWithCache = (
  syncStateManager: OrderSyncStateManager,
  brokerDataManager: BrokerDataManager,
  cache: Cache,
) => {
  const client = createTrading212Client(syncStateManager, brokerDataManager);

  const fetchAccountCash = () => {
    const saved = cache.typesafeGet(
      client.endPoints.accountCash,
      accountCashSchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountCash().andTee((json) => {
      cache.save(client.endPoints.accountCash, JSON.stringify(json));
    });
  };

  const fetchAccountSummary = () => {
    const saved = cache.typesafeGet(
      client.endPoints.accountSummary,
      accountSummarySchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountSummary().andTee((json) => {
      cache.save(client.endPoints.accountSummary, JSON.stringify(json));
    });
  };

  const fetchHistoricalOrders = (params: HistoricalOrdersParams) => {
    const endpoint = client.endPoints.historicalOrders(params);
    const saved = cache.typesafeGet(endpoint, historicalOrdersSchema);
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchHistoricalOrders(params).andTee((json) => {
      cache.save(endpoint, JSON.stringify(json));
    });
  };

  const syncHistoricalOrders = () => {
    return client.syncHistoricalOrders();
  };

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    syncHistoricalOrders,
    endPoints: client.endPoints,
    resetCache: cache.reset,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
