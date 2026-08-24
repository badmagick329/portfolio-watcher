import type {
  AppError,
  CurrentPortfolioSnapshot,
  PortfolioStateSyncResult,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import { createExportCurrentPortfolio } from '../export-current-portfolio';

const portfolioSyncResult: PortfolioStateSyncResult = {
  attemptedPositions: 1,
  persistedPrices: 1,
  persistedPositions: 1,
  persistedAccountSummaries: 1,
};

const snapshot: CurrentPortfolioSnapshot = {
  accountSummary: {
    currency: 'GBP',
    currentValue: 200,
    totalCost: 150,
    realizedProfitLoss: 5,
    unrealizedProfitLoss: 50,
    totalValue: 225,
    asOf: '2026-08-24T12:00:00.000Z',
    fetchedAt: '2026-08-24T12:00:00.000Z',
  },
  holdings: [
    {
      ticker: 'VUAG_GB_EQ',
      name: 'Vanguard S&P 500 UCITS ETF',
      isin: 'IE00BFMXXD54',
      instrumentType: 'ETF',
      category: 'core',
      position: {
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAG_GB_EQ',
        quantity: 2,
        averagePricePaid: 75,
        currentPrice: 100,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 200,
        totalCost: 150,
        unrealizedProfitLoss: 50,
        fxImpact: null,
        asOf: '2026-08-24T12:00:00.000Z',
        fetchedAt: '2026-08-24T12:00:00.000Z',
      },
    },
  ],
};

describe('export current portfolio', () => {
  test('refreshes live data before building an identified portfolio export', async () => {
    const calls: string[] = [];
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => {
        calls.push('catalog');
        return okAsync(1);
      },
      syncPortfolioState: () => {
        calls.push('portfolio');
        return okAsync(portfolioSyncResult);
      },
      dataManager: {
        getLatestCurrentPortfolioSnapshot: () => {
          calls.push('read');
          return okAsync(snapshot);
        },
      },
    });

    const result = await exportCurrentPortfolio();

    expect(calls).toEqual(['catalog', 'portfolio', 'read']);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        asOf: '2026-08-24T12:00:00.000Z',
        accountCurrency: 'GBP',
        summary: {
          holdingsValue: 200,
          holdingsCost: 150,
          realizedProfitLoss: 5,
          unrealizedProfitLoss: 50,
          totalAccountValue: 225,
        },
        holdings: [
          {
            name: 'Vanguard S&P 500 UCITS ETF',
            instrumentType: 'ETF',
            isin: 'IE00BFMXXD54',
            trading212Ticker: 'VUAG_GB_EQ',
            category: 'core',
            quantity: 2,
            averageUnitCost: 75,
            currentUnitPrice: 100,
            priceCurrency: 'GBP',
            totalCost: 150,
            currentValue: 200,
            unrealizedProfitLoss: 50,
            valueCurrency: 'GBP',
            portfolioWeightPercent: 100,
          },
        ],
      });
    }
  });

  test('does not read a stale snapshot when the live portfolio refresh fails', async () => {
    const readSnapshot = vi.fn(() => okAsync(snapshot));
    const error: AppError = { code: 'NETWORK', message: 'Broker unavailable.' };
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => okAsync(1),
      syncPortfolioState: () => errAsync(error),
      dataManager: { getLatestCurrentPortfolioSnapshot: readSnapshot },
    });

    const result = await exportCurrentPortfolio();

    expect(result.isErr()).toBe(true);
    expect(readSnapshot).not.toHaveBeenCalled();
  });

  test('fails when no coherent snapshot exists after refresh', async () => {
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => okAsync(1),
      syncPortfolioState: () => okAsync(portfolioSyncResult),
      dataManager: {
        getLatestCurrentPortfolioSnapshot: () => okAsync(undefined),
      },
    });

    const result = await exportCurrentPortfolio();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'No current portfolio snapshot is available after refresh.',
      );
    }
  });
});
