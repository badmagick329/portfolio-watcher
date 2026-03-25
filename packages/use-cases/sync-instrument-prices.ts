import type {
  AppError,
  InstrumentPriceClient,
  InstrumentPriceFetchResult,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceResolution,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
  InstrumentPriceSyncResult,
} from '@portfolio/domain';
import { ResultAsync, okAsync } from 'neverthrow';

type Params = {
  clients: InstrumentPriceClient[];
  dataManager: {
    listInstrumentsNeedingPriceRefresh: (params: {
      fetchedBefore: string;
      failedAfter: string;
    }) => ResultAsync<InstrumentPriceRefreshCandidate[], AppError>;
    saveInstrumentPriceSource: (
      source: InstrumentPriceSource,
    ) => ResultAsync<void, AppError>;
    saveInstrumentPriceSnapshot: (
      snapshot: InstrumentPriceSnapshot,
    ) => ResultAsync<void, AppError>;
  };
  now?: () => Date;
  refreshIntervalMs?: number;
  failedCooldownMs?: number;
  reResolveFailureThreshold?: number;
};

const defaultRefreshIntervalMs = 60 * 60 * 1000;
const defaultFailedCooldownMs = 15 * 60 * 1000;
const defaultReResolveFailureThreshold = 3;

const createSyncInstrumentPrices = ({
  clients,
  dataManager,
  now = () => new Date(),
  refreshIntervalMs = defaultRefreshIntervalMs,
  failedCooldownMs = defaultFailedCooldownMs,
  reResolveFailureThreshold = defaultReResolveFailureThreshold,
}: Params) => {
  const syncInstrumentPrices = (): ResultAsync<
    InstrumentPriceSyncResult,
    AppError
  > => {
    const nowDate = now();
    const nowIso = nowDate.toISOString();

    return dataManager
      .listInstrumentsNeedingPriceRefresh({
        fetchedBefore: new Date(
          nowDate.getTime() - refreshIntervalMs,
        ).toISOString(),
        failedAfter: new Date(
          nowDate.getTime() - failedCooldownMs,
        ).toISOString(),
      })
      .andThen((candidates) =>
        processCandidates({
          candidates,
          clients,
          dataManager,
          nowIso,
          reResolveFailureThreshold,
          summary: createInitialSummary(candidates.length),
        }),
      );
  };

  return syncInstrumentPrices;
};

const processCandidates = ({
  candidates,
  clients,
  dataManager,
  nowIso,
  reResolveFailureThreshold,
  summary,
}: {
  candidates: InstrumentPriceRefreshCandidate[];
  clients: InstrumentPriceClient[];
  dataManager: Params['dataManager'];
  nowIso: string;
  reResolveFailureThreshold: number;
  summary: InstrumentPriceSyncResult;
}): ResultAsync<InstrumentPriceSyncResult, AppError> => {
  const [candidate, ...rest] = candidates;

  if (!candidate) {
    return okAsync(summary);
  }

  return processCandidate({
    candidate,
    clients,
    dataManager,
    nowIso,
    reResolveFailureThreshold,
    summary,
  }).andThen((nextSummary) =>
    processCandidates({
      candidates: rest,
      clients,
      dataManager,
      nowIso,
      reResolveFailureThreshold,
      summary: nextSummary,
    }),
  );
};

const processCandidate = ({
  candidate,
  clients,
  dataManager,
  nowIso,
  reResolveFailureThreshold,
  summary,
}: {
  candidate: InstrumentPriceRefreshCandidate;
  clients: InstrumentPriceClient[];
  dataManager: Params['dataManager'];
  nowIso: string;
  reResolveFailureThreshold: number;
  summary: InstrumentPriceSyncResult;
}): ResultAsync<InstrumentPriceSyncResult, AppError> => {
  const shouldResolve =
    !candidate.priceSource ||
    candidate.priceSource.consecutiveFailures >= reResolveFailureThreshold;

  const resolveSource = shouldResolve
    ? resolveWithFallback(clients, candidate).andThen((resolved) => {
        if (!resolved) {
          return okAsync({
            source: null,
            summary: {
              ...summary,
              failed: summary.failed + 1,
            },
          });
        }

        const nextSource = toPriceSource(resolved, nowIso);

        return dataManager.saveInstrumentPriceSource(nextSource).map(() => ({
          source: nextSource,
          summary: {
            ...summary,
            resolved: summary.resolved + 1,
            fallbackResolved:
              summary.fallbackResolved +
              (resolved.provider !== clients[0]?.provider ? 1 : 0),
          },
        }));
      })
    : okAsync({
        source: candidate.priceSource,
        summary,
      });

  return resolveSource.andThen(({ source, summary: nextSummary }) => {
    if (!source) {
      return okAsync(nextSummary);
    }

    const client = clients.find((item) => item.provider === source.provider);
    if (!client) {
      return okAsync({
        ...nextSummary,
        failed: nextSummary.failed + 1,
      });
    }

    return client.fetchLatestPrice(source).andThen((fetchResult) =>
      persistSuccessfulFetch({
        dataManager,
        source,
        fetchResult,
        nowIso,
      }).map(() => ({
        ...nextSummary,
        refreshed: nextSummary.refreshed + 1,
      })),
    ).orElse((error) =>
      persistFailedFetch({
        dataManager,
        source,
        error,
        nowIso,
      }).map(() => ({
        ...nextSummary,
        failed: nextSummary.failed + 1,
      })),
    );
  });
};

const resolveWithFallback = (
  clients: InstrumentPriceClient[],
  candidate: InstrumentPriceRefreshCandidate,
): ResultAsync<InstrumentPriceResolution | null, AppError> => {
  const [client, ...rest] = clients;

  if (!client) {
    return okAsync(null);
  }

  return client
    .resolveByIsin(candidate)
    .orElse(() => okAsync(null))
    .andThen((resolved) =>
      resolved ? okAsync(resolved) : resolveWithFallback(rest, candidate),
    );
};

const persistSuccessfulFetch = ({
  dataManager,
  source,
  fetchResult,
  nowIso,
}: {
  dataManager: Params['dataManager'];
  source: InstrumentPriceSource;
  fetchResult: InstrumentPriceFetchResult;
  nowIso: string;
}) =>
  dataManager
    .saveInstrumentPriceSnapshot(toSnapshot(source.isin, nowIso, fetchResult))
    .andThen(() =>
      dataManager.saveInstrumentPriceSource({
        ...source,
        resolvedCurrency: source.resolvedCurrency ?? fetchResult.currency ?? null,
        lastFetchStatus: 'ok',
        lastFetchError: null,
        lastFetchAttemptedAt: nowIso,
        consecutiveFailures: 0,
      }),
    );

const persistFailedFetch = ({
  dataManager,
  source,
  error,
  nowIso,
}: {
  dataManager: Params['dataManager'];
  source: InstrumentPriceSource;
  error: AppError;
  nowIso: string;
}) =>
  dataManager.saveInstrumentPriceSource({
    ...source,
    lastFetchStatus: 'failed',
    lastFetchError: error.message,
    lastFetchAttemptedAt: nowIso,
    consecutiveFailures: source.consecutiveFailures + 1,
  });

const toPriceSource = (
  value: InstrumentPriceResolution,
  nowIso: string,
): InstrumentPriceSource => ({
  ...value,
  lastResolvedAt: nowIso,
  lastFetchStatus: null,
  lastFetchError: null,
  lastFetchAttemptedAt: null,
  consecutiveFailures: 0,
});

const toSnapshot = (
  isin: string,
  fetchedAt: string,
  value: InstrumentPriceFetchResult,
): InstrumentPriceSnapshot => ({
  isin,
  provider: value.provider,
  providerSymbol: value.providerSymbol,
  currency: value.currency,
  price: value.price,
  priceType: value.priceType,
  asOf: value.asOf,
  fetchedAt,
});

const createInitialSummary = (
  attempted: number,
): InstrumentPriceSyncResult => ({
  attempted,
  refreshed: 0,
  skipped: 0,
  failed: 0,
  resolved: 0,
  fallbackResolved: 0,
});

export { createSyncInstrumentPrices };
