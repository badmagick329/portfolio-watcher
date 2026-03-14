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
import {
  endPoints,
  resolveEndPoint,
} from '@/infra/trading212-client/end-points';
import type { FetchParams } from '@/infra/trading212-client/types';
import {
  fetchRequest,
  tryFetchRequestWithRateLimit,
} from '@/infra/trading212-client/utils';
import type {
  AppError,
  HistoricalOrdersParams,
  RateLimitResponse,
  SyncStepResult,
} from '@/types';
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

  const syncHistoricalOrders = (): ResultAsync<SyncStepResult, AppError> => {
    const runNextStep = (): ResultAsync<SyncStepResult, AppError> =>
      syncHistoricalOrdersStep().andThen((result) =>
        result === 'page_processed' || result === 'backfill_completed'
          ? runNextStep()
          : okAsync(result),
      );

    return runNextStep();
  };

  const syncHistoricalOrdersStep = (): ResultAsync<SyncStepResult, AppError> =>
    syncStateManager
      .getState()
      .andThen((state) => buildHistoricalOrdersRequest(creds, state))
      .andThen(({ params, state }) =>
        tryFetchRequestWithRateLimit({
          endPoint: params.endPoint,
          schema: params.schema,
          creds: params.creds,
        }).map((result) => ({ ...result, state })),
      )
      .andThen(({ data, rateLimitResponse, state }) =>
        persistOrdersAndSyncState({
          data,
          rateLimitResponse,
          state,
        }),
      )
      .orElse((e) =>
        e.code === 'RATE_LIMIT'
          ? okAsync('rate_limited' as const)
          : errAsync(e),
      );

  const persistOrdersAndSyncState = ({
    data,
    rateLimitResponse,
    state,
  }: {
    data?: HistoricalOrders;
    rateLimitResponse: RateLimitResponse;
    state?: OrderSyncState;
  }) => {
    const nextState = deriveNextSyncState(data, rateLimitResponse, state);

    if (data) {
      return brokerDataManager
        .saveHistoricalOrders(data.items)
        .andThen((ordersSaved: number) =>
          syncStateManager.setState(nextState).map(() => ordersSaved),
        )
        .map((ordersSaved) => {
          const inPostBackfillSync = Boolean(state?.backfillCompleted);
          if (ordersSaved === 0 && inPostBackfillSync) {
            return 'in_sync' as const;
          }

          return nextState.backfillCompleted && !state?.backfillCompleted
            ? ('backfill_completed' as const)
            : ('page_processed' as const);
        });
    }

    return syncStateManager
      .setState(nextState)
      .map(() => 'rate_limited' as const);
  };

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

const buildHistoricalOrdersRequest = (
  creds: string,
  state?: OrderSyncState,
): ResultAsync<
  {
    state?: OrderSyncState;
    params: FetchParams<HistoricalOrders>;
  },
  AppError
> => {
  const waitUntil = shouldWaitUntil(state);
  if (waitUntil) {
    return errAsync({
      code: 'RATE_LIMIT',
      message: `Rate limit reached, try again later at ${waitUntil.toLocaleString()}`,
    });
  }

  return okAsync({
    state,
    params: {
      endPoint: getNextHistoricalOrdersEndpoint(state),
      schema: historicalOrdersSchema,
      creds,
    },
  });
};

const shouldWaitUntil = (state?: OrderSyncState) => {
  if (state?.rateLimitRemaining !== 0) {
    return undefined;
  }
  const date = new Date(state.rateLimitResetEpoch * 1000);
  if (date > new Date()) {
    return date;
  }
};

const getNextHistoricalOrdersEndpoint = (state?: OrderSyncState) => {
  if (!state?.nextPagePath) {
    return endPoints.historicalOrders({ limit: '50' });
  }

  return resolveEndPoint(state.nextPagePath);
};

const deriveNextSyncState = (
  data: HistoricalOrders | undefined,
  rateLimitResponse: RateLimitResponse,
  state?: OrderSyncState,
): OrderSyncState => {
  if (data !== undefined) {
    return {
      nextPagePath: data.nextPagePath,
      backfillCompleted:
        data.nextPagePath === null || Boolean(state?.backfillCompleted),
      ...rateLimitResponse,
    };
  }

  if (state) {
    return {
      nextPagePath: state.nextPagePath,
      backfillCompleted: state.backfillCompleted,
      ...rateLimitResponse,
    };
  }

  // this should technically never happen?
  return {
    nextPagePath: null,
    backfillCompleted: false,
    ...rateLimitResponse,
  };
};
