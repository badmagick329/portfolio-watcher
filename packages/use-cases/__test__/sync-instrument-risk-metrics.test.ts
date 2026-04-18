import { describe, expect, test } from 'vitest';
import type {
  AppError,
  BrokerDataManager,
  CategorizedInstrument,
  CurrentPositionSnapshot,
  InstrumentRiskClient,
  InstrumentRiskMetricSnapshot,
  InstrumentRiskMetricSyncStatus,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { createSyncInstrumentRiskMetrics } from '../sync-instrument-risk-metrics';

const apple: CategorizedInstrument = {
  ticker: 'AAPL_US_EQ',
  name: 'Apple Inc.',
  isin: 'US0378331005',
  currency: 'USD',
  category: 'growth',
};

const vodafone: CategorizedInstrument = {
  ticker: 'VOD_LN_EQ',
  name: 'Vodafone Group plc',
  isin: 'GB00BH4HKS39',
  currency: 'GBP',
  category: 'income',
};

describe('sync instrument risk metrics', () => {
  test('persists beta for mapped current holdings', async () => {
    const saved: InstrumentRiskMetricSnapshot[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({ betaBySymbol: { 'VOD.L': 0.7 } }),
      dataManager: dataManager({
        instruments: [vodafone],
        mappings: { GB00BH4HKS39: 'VOD.L' },
        saved,
      }),
      now: () => new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        attempted: 1,
        persisted: 1,
        missingMapping: 0,
        missingBeta: 0,
        failed: 0,
        skippedFresh: 0,
        skippedMissing: 0,
        rateLimited: false,
      });
    }
    expect(saved).toEqual([
      {
        isin: 'GB00BH4HKS39',
        provider: 'fmp',
        providerSymbol: 'VOD.L',
        beta: 0.7,
        sourceType: 'profile',
        asOf: '2026-04-17T10:00:00.000Z',
        fetchedAt: '2026-04-17T10:00:00.000Z',
      },
    ]);
  });

  test('uses US public ticker fallback without mapping', async () => {
    const saved: InstrumentRiskMetricSnapshot[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({ betaBySymbol: { AAPL: 1.2 } }),
      dataManager: dataManager({
        instruments: [apple],
        mappings: {},
        saved,
      }),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    expect(saved[0]?.providerSymbol).toBe('AAPL');
  });

  test('skips missing mapping and missing beta', async () => {
    const saved: InstrumentRiskMetricSnapshot[] = [];
    const savedStatuses: InstrumentRiskMetricSyncStatus[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({ betaBySymbol: { AAPL: null } }),
      dataManager: dataManager({
        instruments: [apple, vodafone],
        mappings: {},
        saved,
        savedStatuses,
      }),
      now: () => new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.missingBeta).toBe(1);
      expect(result.value.missingMapping).toBe(1);
      expect(result.value.persisted).toBe(0);
    }
    expect(savedStatuses).toEqual([
      {
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
        status: 'missing_beta',
        checkedAt: '2026-04-17T10:00:00.000Z',
        message: 'FMP profile for AAPL did not include beta.',
      },
    ]);
  });

  test('one API failure does not stop other symbols', async () => {
    const saved: InstrumentRiskMetricSnapshot[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({ betaBySymbol: { AAPL: 1.1 }, failedSymbols: ['VOD.L'] }),
      dataManager: dataManager({
        instruments: [apple, vodafone],
        mappings: { GB00BH4HKS39: 'VOD.L' },
        saved,
      }),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.failed).toBe(1);
      expect(result.value.persisted).toBe(1);
    }
  });

  test('skips fresh beta and recent missing-beta status', async () => {
    const requestedSymbols: string[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({
        betaBySymbol: {},
        requestedSymbols,
      }),
      dataManager: dataManager({
        instruments: [apple, vodafone],
        mappings: { GB00BH4HKS39: 'VOD.L' },
        saved: [],
        existingMetrics: {
          US0378331005: {
            isin: 'US0378331005',
            provider: 'fmp',
            providerSymbol: 'AAPL',
            beta: 1.2,
            sourceType: 'profile',
            asOf: '2026-04-10T10:00:00.000Z',
            fetchedAt: '2026-04-10T10:00:00.000Z',
          },
        },
        existingStatuses: {
          GB00BH4HKS39: {
            isin: 'GB00BH4HKS39',
            provider: 'fmp',
            providerSymbol: 'VOD.L',
            status: 'missing_beta',
            checkedAt: '2026-04-10T10:00:00.000Z',
            message: null,
          },
        },
      }),
      now: () => new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.skippedFresh).toBe(1);
      expect(result.value.skippedMissing).toBe(1);
      expect(result.value.attempted).toBe(0);
    }
    expect(requestedSymbols).toEqual([]);
  });

  test('processes largest holdings first and stops on rate limit', async () => {
    const requestedSymbols: string[] = [];
    const sync = createSyncInstrumentRiskMetrics({
      client: riskClient({
        betaBySymbol: { AAPL: 1.1 },
        rateLimitedSymbols: ['VOD.L'],
        requestedSymbols,
      }),
      dataManager: dataManager({
        instruments: [apple, vodafone],
        mappings: { GB00BH4HKS39: 'VOD.L' },
        saved: [],
        currentValues: {
          US0378331005: 100,
          GB00BH4HKS39: 500,
        },
      }),
    });

    const result = await sync();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rateLimited).toBe(true);
      expect(result.value.attempted).toBe(1);
      expect(result.value.persisted).toBe(0);
    }
    expect(requestedSymbols).toEqual(['VOD.L']);
  });

  test('fails sync when FMP API key is missing', async () => {
    const sync = createSyncInstrumentRiskMetrics({
      client: {
        fetchInstrumentRiskProfile: () =>
          errAsync({
            code: 'VALIDATION',
            message: 'FMP_API_KEY is required.',
          }),
      },
      dataManager: dataManager({
        instruments: [apple],
        mappings: {},
        saved: [],
      }),
    });

    const result = await sync();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: 'VALIDATION',
        message: 'FMP_API_KEY is required.',
      });
    }
  });
});

function dataManager({
  instruments,
  mappings,
  saved,
  savedStatuses = [],
  existingMetrics = {},
  existingStatuses = {},
  currentValues = {},
}: {
  instruments: CategorizedInstrument[];
  mappings: Record<string, string>;
  saved: InstrumentRiskMetricSnapshot[];
  savedStatuses?: InstrumentRiskMetricSyncStatus[];
  existingMetrics?: Record<string, InstrumentRiskMetricSnapshot>;
  existingStatuses?: Record<string, InstrumentRiskMetricSyncStatus>;
  currentValues?: Record<string, number>;
}): Pick<
  BrokerDataManager,
  | 'listCategorizedInstruments'
  | 'getLatestCurrentPositionSnapshotByIsin'
  | 'getInstrumentProviderSymbol'
  | 'getLatestInstrumentRiskMetricByIsin'
  | 'getInstrumentRiskMetricSyncStatus'
  | 'saveInstrumentRiskMetricSnapshot'
  | 'saveInstrumentRiskMetricSyncStatus'
> {
  return {
    listCategorizedInstruments: () => okAsync(instruments),
    getLatestCurrentPositionSnapshotByIsin: (isin) =>
      okAsync(positionSnapshot(isin, currentValues[isin] ?? 100)),
    getInstrumentProviderSymbol: (isin) =>
      okAsync(
        mappings[isin]
          ? {
              isin,
              provider: 'fmp',
              providerSymbol: mappings[isin],
              updatedAt: '2026-04-17T10:00:00.000Z',
            }
          : undefined,
      ),
    getLatestInstrumentRiskMetricByIsin: (isin) =>
      okAsync(existingMetrics[isin]),
    getInstrumentRiskMetricSyncStatus: ({ isin }) =>
      okAsync(existingStatuses[isin]),
    saveInstrumentRiskMetricSnapshot: (snapshot) => {
      saved.push(snapshot);
      return okAsync(undefined);
    },
    saveInstrumentRiskMetricSyncStatus: (status) => {
      savedStatuses.push(status);
      return okAsync(undefined);
    },
  };
}

function riskClient({
  betaBySymbol,
  failedSymbols = [],
  rateLimitedSymbols = [],
  requestedSymbols,
}: {
  betaBySymbol: Record<string, number | null>;
  failedSymbols?: string[];
  rateLimitedSymbols?: string[];
  requestedSymbols?: string[];
}): InstrumentRiskClient {
  return {
    fetchInstrumentRiskProfile: (symbol) => {
      requestedSymbols?.push(symbol);

      if (rateLimitedSymbols.includes(symbol)) {
        return errAsync({
          code: 'RATE_LIMIT',
          message: 'rate limited',
          rateLimitResponse: {
            rateLimitLimit: 0,
            rateLimitPeriodSec: 0,
            rateLimitRemaining: 0,
            rateLimitResetEpoch: 0,
            rateLimitUsed: 0,
          },
        });
      }

      if (failedSymbols.includes(symbol)) {
        return errAsync(apiError('boom'));
      }

      return okAsync({
        symbol,
        companyName: symbol,
        isin: null,
        beta: betaBySymbol[symbol] ?? null,
      });
    },
  };
}

const positionSnapshot = (
  isin: string,
  currentValue = 100,
): CurrentPositionSnapshot => ({
  isin,
  providerSymbol: isin,
  quantity: 1,
  currentPrice: 100,
  instrumentCurrency: 'USD',
  walletCurrency: 'GBP',
  currentValue,
  totalCost: 90,
  unrealizedProfitLoss: 10,
  fxImpact: null,
  asOf: '2026-04-17T09:00:00.000Z',
  fetchedAt: '2026-04-17T09:00:00.000Z',
});

const apiError = (message: string): AppError => ({
  code: 'API',
  message,
});
