import type {
  AppError,
  BrokerDataManager,
  CategorizedInstrument,
  CurrentPositionSnapshot,
  InstrumentRiskClient,
  InstrumentRiskMetricSnapshot,
  SyncInstrumentRiskMetricsResult,
} from '@portfolio/domain';
import { ResultAsync, errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const RISK_METRIC_FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000;
const MISSING_BETA_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

type Params = {
  client: InstrumentRiskClient;
  dataManager: Pick<
    BrokerDataManager,
    | 'listCategorizedInstruments'
    | 'getFeatureFlag'
    | 'getLatestCurrentPortfolioPositionSnapshotByIsin'
    | 'getInstrumentProviderSymbol'
    | 'getLatestInstrumentRiskMetricByIsin'
    | 'getInstrumentRiskMetricSyncStatus'
    | 'saveInstrumentRiskMetricSnapshot'
    | 'saveInstrumentRiskMetricSyncStatus'
  >;
  now?: () => Date;
};

const createSyncInstrumentRiskMetrics = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => (): ResultAsync<SyncInstrumentRiskMetricsResult, AppError> =>
  dataManager.getFeatureFlag('risk_metrics_enabled').andThen((enabled) => {
    if (!enabled) {
      return errAsync(validationError('Risk metrics feature is disabled.'));
    }

    return ResultAsync.fromPromise(
      syncInstrumentRiskMetrics({ client, dataManager, now }),
      (error): AppError =>
        error instanceof AppErrorException
          ? error.appError
          : {
              code: 'DATABASE',
              message:
                error instanceof Error
                  ? error.message
                  : `Failed to sync instrument risk metrics: ${String(error)}`,
            },
    );
  });

class AppErrorException extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message);
  }
}

async function syncInstrumentRiskMetrics({
  client,
  dataManager,
  now,
}: Required<Params>): Promise<SyncInstrumentRiskMetricsResult> {
  const instrumentsResult = await dataManager.listCategorizedInstruments();

  if (instrumentsResult.isErr()) {
    throw new AppErrorException(instrumentsResult.error);
  }

  const fetchedAt = now().toISOString();
  const summary: SyncInstrumentRiskMetricsResult = {
    attempted: 0,
    persisted: 0,
    missingMapping: 0,
    missingBeta: 0,
    failed: 0,
    skippedFresh: 0,
    skippedMissing: 0,
    rateLimited: false,
  };
  const currentHoldings = await getCurrentHoldings({
    dataManager,
    instruments: instrumentsResult.value,
  });

  for (const { instrument } of currentHoldings) {
    const providerSymbol = await resolveProviderSymbol(dataManager, instrument);

    if (!providerSymbol) {
      summary.missingMapping++;
      continue;
    }

    const existingMetric = await dataManager
      .getLatestInstrumentRiskMetricByIsin(instrument.isin, 'fmp')
      .match(
        (metric) => metric,
        () => undefined,
      );

    if (isRecent(existingMetric?.asOf, fetchedAt, RISK_METRIC_FRESHNESS_MS)) {
      summary.skippedFresh++;
      continue;
    }

    const missingStatus = await dataManager
      .getInstrumentRiskMetricSyncStatus({
        isin: instrument.isin,
        provider: 'fmp',
        providerSymbol,
      })
      .match(
        (status) => status,
        () => undefined,
      );

    if (
      missingStatus?.status === 'missing_beta' &&
      isRecent(missingStatus.checkedAt, fetchedAt, MISSING_BETA_COOLDOWN_MS)
    ) {
      summary.skippedMissing++;
      continue;
    }

    summary.attempted++;
    const profileResult = await client.fetchInstrumentRiskProfile(providerSymbol);

    if (profileResult.isErr()) {
      if (
        profileResult.error.code === 'VALIDATION' &&
        profileResult.error.message === 'FMP_API_KEY is required.'
      ) {
        throw new AppErrorException(profileResult.error);
      }

      if (profileResult.error.code === 'RATE_LIMIT') {
        summary.rateLimited = true;
        break;
      }

      summary.failed++;
      continue;
    }

    if (profileResult.value.beta === null) {
      await dataManager.saveInstrumentRiskMetricSyncStatus({
        isin: instrument.isin,
        provider: 'fmp',
        providerSymbol,
        status: 'missing_beta',
        checkedAt: fetchedAt,
        message: `FMP profile for ${providerSymbol} did not include beta.`,
      });
      summary.missingBeta++;
      continue;
    }

    const saveResult = await dataManager.saveInstrumentRiskMetricSnapshot(
      toRiskMetricSnapshot({
        beta: profileResult.value.beta,
        fetchedAt,
        instrument,
        providerSymbol,
      }),
    );

    if (saveResult.isOk()) {
      summary.persisted++;
    } else {
      summary.failed++;
    }
  }

  return summary;
}

async function getCurrentHoldings({
  dataManager,
  instruments,
}: {
  dataManager: Pick<
    BrokerDataManager,
    'getLatestCurrentPortfolioPositionSnapshotByIsin'
  >;
  instruments: CategorizedInstrument[];
}) {
  const holdings: Array<{
    instrument: CategorizedInstrument;
    snapshot: CurrentPositionSnapshot;
  }> = [];

  for (const instrument of instruments) {
    const snapshot = await getCurrentHoldingSnapshot(dataManager, instrument);

    if (snapshot) {
      holdings.push({ instrument, snapshot });
    }
  }

  return holdings.sort(
    (left, right) => right.snapshot.currentValue - left.snapshot.currentValue,
  );
}

async function getCurrentHoldingSnapshot(
  dataManager: Pick<
    BrokerDataManager,
    'getLatestCurrentPortfolioPositionSnapshotByIsin'
  >,
  instrument: CategorizedInstrument,
) {
  const result = await dataManager
    .getLatestCurrentPortfolioPositionSnapshotByIsin(instrument.isin)
    .match(
      (snapshot) => snapshot,
      () => undefined,
    );

  return result && result.quantity > 0 ? result : null;
}

async function resolveProviderSymbol(
  dataManager: Pick<BrokerDataManager, 'getInstrumentProviderSymbol'>,
  instrument: CategorizedInstrument,
) {
  const mapping = await dataManager
    .getInstrumentProviderSymbol(instrument.isin, 'fmp')
    .match(
      (value) => value,
      () => undefined,
    );

  if (mapping) {
    return mapping.providerSymbol;
  }

  return null;
}

const isRecent = (
  isoDate: string | undefined,
  nowIsoDate: string,
  ttlMs: number,
) => {
  if (!isoDate) {
    return false;
  }

  const checkedAt = new Date(isoDate).getTime();
  const now = new Date(nowIsoDate).getTime();

  return Number.isFinite(checkedAt) && now - checkedAt < ttlMs;
};

const toRiskMetricSnapshot = ({
  beta,
  fetchedAt,
  instrument,
  providerSymbol,
}: {
  beta: number;
  fetchedAt: string;
  instrument: CategorizedInstrument;
  providerSymbol: string;
}): InstrumentRiskMetricSnapshot => ({
  isin: instrument.isin,
  provider: 'fmp',
  providerSymbol,
  beta,
  sourceType: 'profile',
  asOf: fetchedAt,
  fetchedAt,
});

export { createSyncInstrumentRiskMetrics };
