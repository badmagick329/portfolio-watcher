import type { BrokerClient, BrokerDataManager } from '@/core/broker-client';
import type {
  OrderSyncState,
  OrderSyncStateManager,
} from '@/core/order-sync-state';
import {
  endPoints,
  resolveEndPoint,
} from '@/infra/trading212-client/end-points';
import type { FetchParams } from '@/infra/trading212-client/types';
import { tryFetchRequestWithRateLimit } from '@/infra/trading212-client/utils';
import type { AppError, RateLimitResponse, SyncStepResult } from '@/types';
import {
  type HistoricalOrders,
  historicalOrdersSchema,
} from '@/types/schemas/api-responses';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';

type Params = {
  client: BrokerClient;
  dataManager: BrokerDataManager;
  syncStateManager: OrderSyncStateManager;
};
const createSyncHistoricalOrders = ({
  client,
  dataManager,
  syncStateManager,
}: Params) => {
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
      .andThen((state) => buildHistoricalOrdersRequest(client.creds, state))
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
      return dataManager
        .saveHistoricalOrders(data.items)
        .andThen((ordersSaved: number) => {
          const inPostBackfillSync = Boolean(state?.backfillCompleted);
          const stateToPersist =
            ordersSaved === 0 && inPostBackfillSync
              ? {
                  ...nextState,
                  nextPagePath: null,
                }
              : nextState;

          return syncStateManager.setState(stateToPersist).map(() => ordersSaved);
        })
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

  return syncHistoricalOrders;
};

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
    console.warn(
      `Rate limit reached, try again later at ${waitUntil.toLocaleString()}`,
    );
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

export { createSyncHistoricalOrders };
