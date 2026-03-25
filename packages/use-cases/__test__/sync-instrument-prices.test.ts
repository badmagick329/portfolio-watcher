import { describe, expect, test } from 'vitest';
import type {
  AppError,
  InstrumentPriceClient,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { createSyncInstrumentPrices } from '../sync-instrument-prices';

const baseCandidate: InstrumentPriceRefreshCandidate = {
  ticker: 'AMD_US_EQ',
  name: 'Advanced Micro Devices',
  isin: 'US0079031078',
  currency: 'USD',
  latestPriceFetchedAt: null,
  priceSource: null,
};

const baseResolution = {
  isin: baseCandidate.isin,
  providerSymbol: 'AMD',
  providerExchange: 'NASDAQ',
  providerMic: null,
  resolvedName: 'Advanced Micro Devices',
  resolvedCurrency: 'USD',
  resolutionConfidence: 0.95,
};

const baseFetch = {
  providerSymbol: 'AMD',
  currency: 'USD',
  price: 123.45,
  priceType: 'eod' as const,
  asOf: '2026-03-24',
};

const createDataManager = (
  candidates: InstrumentPriceRefreshCandidate[],
  params: {
    latestPrice?: InstrumentPriceSnapshot;
  } = {},
) => {
  const savedSources: InstrumentPriceSource[] = [];
  const savedSnapshots: InstrumentPriceSnapshot[] = [];

  return {
    savedSources,
    savedSnapshots,
    api: {
      listInstrumentsNeedingPriceRefresh: () => okAsync(candidates),
      saveInstrumentPriceSource: (source: InstrumentPriceSource) => {
        savedSources.push(source);
        return okAsync(undefined);
      },
      saveInstrumentPriceSnapshot: (snapshot: InstrumentPriceSnapshot) => {
        savedSnapshots.push(snapshot);
        return okAsync(undefined);
      },
    },
  };
};

describe('syncInstrumentPrices', () => {
  test('resolves missing mappings and saves a price snapshot', async () => {
    const dataManager = createDataManager([baseCandidate]);
    const clients: InstrumentPriceClient[] = [
      {
        provider: 'fmp',
        resolveByIsin: () =>
          okAsync({
            ...baseResolution,
            provider: 'fmp' as const,
          }),
        fetchLatestPrice: () =>
          okAsync({
            ...baseFetch,
            provider: 'fmp' as const,
          }),
      },
      {
        provider: 'eodhd',
        resolveByIsin: () => okAsync(null),
        fetchLatestPrice: () =>
          okAsync({
            ...baseFetch,
            provider: 'eodhd' as const,
          }),
      },
    ];

    const syncInstrumentPrices = createSyncInstrumentPrices({
      clients,
      dataManager: dataManager.api,
      now: () => new Date('2026-03-25T12:00:00.000Z'),
    });

    const result = await syncInstrumentPrices();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        attempted: 1,
        refreshed: 1,
        skipped: 0,
        failed: 0,
        resolved: 1,
        fallbackResolved: 0,
      });
    }
    expect(dataManager.savedSources).toHaveLength(2);
    expect(dataManager.savedSnapshots).toHaveLength(1);
    expect(dataManager.savedSnapshots[0]?.provider).toBe('fmp');
  });

  test('uses an existing healthy mapping without re-resolving', async () => {
    const candidate: InstrumentPriceRefreshCandidate = {
      ...baseCandidate,
      priceSource: {
        isin: baseCandidate.isin,
        provider: 'fmp',
        providerSymbol: 'AMD',
        providerExchange: 'NASDAQ',
        providerMic: null,
        resolvedName: 'Advanced Micro Devices',
        resolvedCurrency: 'USD',
        resolutionConfidence: 0.95,
        lastResolvedAt: '2026-03-24T12:00:00.000Z',
        lastFetchStatus: 'ok',
        lastFetchError: null,
        lastFetchAttemptedAt: '2026-03-24T12:00:00.000Z',
        consecutiveFailures: 0,
      },
    };
    const dataManager = createDataManager([candidate]);
    let resolveCalls = 0;
    let fetchCalls = 0;

    const clients: InstrumentPriceClient[] = [
      {
        provider: 'fmp',
        resolveByIsin: () => {
          resolveCalls++;
          return okAsync({
            ...baseResolution,
            provider: 'fmp' as const,
          });
        },
        fetchLatestPrice: () => {
          fetchCalls++;
          return okAsync({
            ...baseFetch,
            provider: 'fmp' as const,
          });
        },
      },
    ];

    const result = await createSyncInstrumentPrices({
      clients,
      dataManager: dataManager.api,
    })();

    expect(result.isOk()).toBe(true);
    expect(resolveCalls).toBe(0);
    expect(fetchCalls).toBe(1);
  });

  test('falls back from FMP to EODHD when FMP cannot resolve', async () => {
    const dataManager = createDataManager([baseCandidate]);

    const clients: InstrumentPriceClient[] = [
      {
        provider: 'fmp',
        resolveByIsin: () => okAsync(null),
        fetchLatestPrice: () =>
          okAsync({
            ...baseFetch,
            provider: 'fmp' as const,
          }),
      },
      {
        provider: 'eodhd',
        resolveByIsin: () =>
          okAsync({
            ...baseResolution,
            provider: 'eodhd' as const,
            providerExchange: 'US',
          }),
        fetchLatestPrice: () =>
          okAsync({
            ...baseFetch,
            provider: 'eodhd' as const,
          }),
      },
    ];

    const result = await createSyncInstrumentPrices({
      clients,
      dataManager: dataManager.api,
    })();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.fallbackResolved).toBe(1);
    }
    expect(dataManager.savedSnapshots[0]?.provider).toBe('eodhd');
  });

  test('re-resolves after repeated failures', async () => {
    const dataManager = createDataManager([
      {
        ...baseCandidate,
        priceSource: {
          isin: baseCandidate.isin,
          provider: 'fmp',
          providerSymbol: 'OLD',
          providerExchange: 'NASDAQ',
          providerMic: null,
          resolvedName: 'Old Name',
          resolvedCurrency: 'USD',
          resolutionConfidence: 0.6,
          lastResolvedAt: '2026-03-20T00:00:00.000Z',
          lastFetchStatus: 'failed',
          lastFetchError: 'bad symbol',
          lastFetchAttemptedAt: '2026-03-20T00:00:00.000Z',
          consecutiveFailures: 3,
        },
      },
    ]);
    let resolved = false;

    const clients: InstrumentPriceClient[] = [
      {
        provider: 'fmp',
        resolveByIsin: () => {
          resolved = true;
          return okAsync({
            ...baseResolution,
            provider: 'fmp' as const,
          });
        },
        fetchLatestPrice: () =>
          okAsync({
            ...baseFetch,
            provider: 'fmp' as const,
          }),
      },
    ];

    const result = await createSyncInstrumentPrices({
      clients,
      dataManager: dataManager.api,
    })();

    expect(result.isOk()).toBe(true);
    expect(resolved).toBe(true);
  });

  test('continues when one instrument fails', async () => {
    const dataManager = createDataManager([
      baseCandidate,
      {
        ...baseCandidate,
        ticker: 'AAPL_US_EQ',
        isin: 'US0378331005',
        name: 'Apple',
      },
    ]);
    let fetchCount = 0;

    const clients: InstrumentPriceClient[] = [
      {
        provider: 'fmp',
        resolveByIsin: (input) =>
          okAsync({
            ...baseResolution,
            isin: input.isin,
            resolvedName: input.name,
            provider: 'fmp' as const,
            providerSymbol: input.isin === baseCandidate.isin ? 'AMD' : 'AAPL',
          }),
        fetchLatestPrice: (source) => {
          fetchCount++;
          if (source.providerSymbol === 'AMD') {
            return errAsync({
              code: 'API',
              message: 'boom',
            } satisfies AppError);
          }

          return okAsync({
            ...baseFetch,
            provider: 'fmp' as const,
            providerSymbol: 'AAPL',
          });
        },
      },
    ];

    const result = await createSyncInstrumentPrices({
      clients,
      dataManager: dataManager.api,
    })();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.failed).toBe(1);
      expect(result.value.refreshed).toBe(1);
    }
    expect(fetchCount).toBe(2);
    expect(dataManager.savedSnapshots).toHaveLength(1);
  });
});
