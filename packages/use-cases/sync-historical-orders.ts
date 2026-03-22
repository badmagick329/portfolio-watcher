import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  HistoricalOrders,
  HistoricalOrdersInput,
  HistoricalOrdersParams,
  OrderSyncState,
  OrderSyncStateManager,
  SyncStepResult,
} from '@portfolio/domain';
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
      .map((state) => ({
        state,
        request: getNextHistoricalOrdersRequest(state),
      }))
      .andThen(({ request, state }) =>
        client.fetchHistoricalOrders(request).map((data) => ({ data, state })),
      )
      .andThen(({ data, state }) => persistOrdersAndSyncState({ data, state }))
      .orElse((e) => {
        if (e.code !== 'RATE_LIMIT') {
          return errAsync(e);
        }

        return syncStateManager
          .getState()
          .andThen((state) =>
            syncStateManager
              .setState(deriveRateLimitedSyncState(e, state))
              .map(() => 'rate_limited' as const),
          );
      });

  const persistOrdersAndSyncState = ({
    data,
    state,
  }: {
    data: HistoricalOrders;
    state?: OrderSyncState;
  }) => {
    const nextState = deriveNextSyncState(data, state);

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
  };

  return syncHistoricalOrders;
};

const getNextHistoricalOrdersRequest = (
  state?: OrderSyncState,
): HistoricalOrdersInput => {
  if (!state?.nextPagePath) {
    return { limit: '50' } satisfies HistoricalOrdersParams;
  }

  return { nextPagePath: state.nextPagePath };
};

const deriveNextSyncState = (
  data: HistoricalOrders,
  state?: OrderSyncState,
): OrderSyncState => ({
  nextPagePath: data.nextPagePath,
  backfillCompleted:
    data.nextPagePath === null || Boolean(state?.backfillCompleted),
  rateLimitLimit: state?.rateLimitLimit ?? 0,
  rateLimitPeriodSec: state?.rateLimitPeriodSec ?? 0,
  rateLimitRemaining: state?.rateLimitRemaining ?? 0,
  rateLimitResetEpoch: state?.rateLimitResetEpoch ?? 0,
  rateLimitUsed: state?.rateLimitUsed ?? 0,
});

const deriveRateLimitedSyncState = (
  error: Extract<AppError, { code: 'RATE_LIMIT' }>,
  state?: OrderSyncState,
): OrderSyncState => ({
  nextPagePath: state?.nextPagePath ?? null,
  backfillCompleted: state?.backfillCompleted ?? false,
  ...error.rateLimitResponse,
});

export { createSyncHistoricalOrders };
