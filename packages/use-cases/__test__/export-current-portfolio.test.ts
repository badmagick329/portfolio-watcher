import type {
  AppError,
  CurrentPortfolioSnapshot,
  PortfolioHistoryInstrument,
  PortfolioStateSyncResult,
  WebHistoricalOrder,
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

const historyInstruments: PortfolioHistoryInstrument[] = [
  {
    name: 'Vanguard S&P 500 UCITS ETF',
    isin: 'IE00BFMXXD54',
    tickers: ['VUAG_GB_EQ', 'VUAG_OLD_EQ'],
    instrumentType: 'ETF',
    category: 'core',
  },
  {
    name: 'Example Closed Company',
    isin: 'US0000000001',
    tickers: ['OLD_US_EQ'],
    instrumentType: 'EQUITY',
    category: null,
  },
];

const historicalOrders: WebHistoricalOrder[] = [
  historicalOrder({
    id: 1,
    ticker: 'VUAG_OLD_EQ',
    isin: 'IE00BFMXXD54',
    name: 'Vanguard S&P 500 UCITS ETF',
    side: 'BUY',
    fillId: 11,
    filledAt: '2024-01-02T10:00:00.000Z',
    quantity: 3,
    price: 70,
    walletValue: -210,
    taxes: [
      {
        name: 'Stamp duty',
        quantity: 1,
        currency: 'GBP',
        chargedAt: '2024-01-02T10:00:00.000Z',
      },
    ],
  }),
  historicalOrder({
    id: 2,
    ticker: 'VUAG_GB_EQ',
    isin: 'IE00BFMXXD54',
    name: 'Vanguard S&P 500 UCITS ETF',
    side: 'SELL',
    fillId: 12,
    filledAt: '2025-02-03T11:00:00.000Z',
    quantity: 1,
    price: 90,
    walletValue: 90,
  }),
  historicalOrder({
    id: 3,
    ticker: 'OLD_US_EQ',
    isin: 'US0000000001',
    name: 'Example Closed Company',
    side: 'BUY',
    fillId: 13,
    filledAt: '2022-03-04T12:00:00.000Z',
    quantity: 5,
    price: 10,
    walletValue: -40,
    priceCurrency: 'USD',
  }),
  historicalOrder({
    id: 4,
    ticker: 'OLD_US_EQ',
    isin: 'US0000000001',
    name: 'Example Closed Company',
    side: 'SELL',
    fillId: 14,
    filledAt: '2023-04-05T13:00:00.000Z',
    quantity: 5,
    price: 12,
    walletValue: 48,
    priceCurrency: 'USD',
  }),
  historicalOrder({
    id: 5,
    ticker: 'CANCELLED_US_EQ',
    isin: 'US0000000002',
    name: 'Cancelled Company',
    side: 'BUY',
    fills: [],
  }),
];

describe('export current portfolio', () => {
  test('refreshes all data and exports current and closed holding histories', async () => {
    const calls: string[] = [];
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => {
        calls.push('catalog');
        return okAsync(2);
      },
      syncHistoricalOrders: () => {
        calls.push('orders');
        return okAsync('in_sync');
      },
      syncPortfolioState: () => {
        calls.push('portfolio');
        return okAsync(portfolioSyncResult);
      },
      dataManager: {
        getLatestCurrentPortfolioSnapshot: () => {
          calls.push('snapshot');
          return okAsync(snapshot);
        },
        getHistoricalOrdersForWeb: () => {
          calls.push('history');
          return okAsync({ items: historicalOrders, filters: {} });
        },
        getPortfolioHistoryInstruments: () => {
          calls.push('instruments');
          return okAsync(historyInstruments);
        },
      },
    });

    const result = await exportCurrentPortfolio();

    expect(calls).toEqual([
      'catalog',
      'orders',
      'portfolio',
      'snapshot',
      'history',
      'instruments',
    ]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.holdings).toEqual([
        expect.objectContaining({
          name: 'Vanguard S&P 500 UCITS ETF',
          isin: 'IE00BFMXXD54',
          quantity: 2,
        }),
      ]);
      expect(result.value.holdingHistory).toHaveLength(2);
      expect(result.value.holdingHistory[0]).toMatchObject({
        name: 'Example Closed Company',
        currentlyHeld: false,
        currentQuantity: 0,
        firstPurchasedAt: '2022-03-04T12:00:00.000Z',
        lastPurchasedAt: '2022-03-04T12:00:00.000Z',
        firstSoldAt: '2023-04-05T13:00:00.000Z',
        lastSoldAt: '2023-04-05T13:00:00.000Z',
      });
      expect(result.value.holdingHistory[1]).toMatchObject({
        name: 'Vanguard S&P 500 UCITS ETF',
        trading212Tickers: ['VUAG_GB_EQ', 'VUAG_OLD_EQ'],
        currentlyHeld: true,
        currentQuantity: 2,
        firstPurchasedAt: '2024-01-02T10:00:00.000Z',
        firstSoldAt: '2025-02-03T11:00:00.000Z',
      });
      expect(result.value.holdingHistory[1]?.purchases[0]).toEqual({
        orderId: 1,
        fillId: 11,
        filledAt: '2024-01-02T10:00:00.000Z',
        quantity: 3,
        unitPrice: 70,
        priceCurrency: 'GBP',
        walletValue: -210,
        walletCurrency: 'GBP',
        walletFxRate: 1,
        taxes: [
          {
            name: 'Stamp duty',
            quantity: 1,
            currency: 'GBP',
            chargedAt: '2024-01-02T10:00:00.000Z',
          },
        ],
      });
      expect(
        result.value.holdingHistory.some(
          (holding) => holding.name === 'Cancelled Company',
        ),
      ).toBe(false);
    }
  });

  test('rejects a rate-limited history sync before refreshing current data', async () => {
    const syncPortfolioState = vi.fn(() => okAsync(portfolioSyncResult));
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => okAsync(1),
      syncHistoricalOrders: () => okAsync('rate_limited'),
      syncPortfolioState,
      dataManager: createEmptyDataManager(),
    });

    const result = await exportCurrentPortfolio();

    expect(result.isErr()).toBe(true);
    expect(syncPortfolioState).not.toHaveBeenCalled();
    if (result.isErr()) {
      expect(result.error.message).toContain('history may be incomplete');
    }
  });

  test('does not read a stale snapshot when the live portfolio refresh fails', async () => {
    const dataManager = createEmptyDataManager();
    const readSnapshot = vi.spyOn(
      dataManager,
      'getLatestCurrentPortfolioSnapshot',
    );
    const error: AppError = { code: 'NETWORK', message: 'Broker unavailable.' };
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => okAsync(1),
      syncHistoricalOrders: () => okAsync('in_sync'),
      syncPortfolioState: () => errAsync(error),
      dataManager,
    });

    const result = await exportCurrentPortfolio();

    expect(result.isErr()).toBe(true);
    expect(readSnapshot).not.toHaveBeenCalled();
  });

  test('fails when no coherent snapshot exists after refresh', async () => {
    const exportCurrentPortfolio = createExportCurrentPortfolio({
      syncInstrumentCatalog: () => okAsync(1),
      syncHistoricalOrders: () => okAsync('in_sync'),
      syncPortfolioState: () => okAsync(portfolioSyncResult),
      dataManager: createEmptyDataManager(),
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

function createEmptyDataManager() {
  return {
    getLatestCurrentPortfolioSnapshot: () => okAsync(undefined),
    getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
    getPortfolioHistoryInstruments: () => okAsync([]),
  };
}

function historicalOrder({
  id,
  ticker,
  isin,
  name,
  side,
  fillId = 1,
  filledAt = '2026-01-01T10:00:00.000Z',
  quantity = 1,
  price = 1,
  walletValue = 1,
  priceCurrency = 'GBP',
  taxes = [],
  fills,
}: {
  id: number;
  ticker: string;
  isin: string;
  name: string;
  side: 'BUY' | 'SELL';
  fillId?: number;
  filledAt?: string;
  quantity?: number;
  price?: number;
  walletValue?: number;
  priceCurrency?: string;
  taxes?: WebHistoricalOrder['fills'][number]['walletImpact']['taxes'];
  fills?: WebHistoricalOrder['fills'];
}): WebHistoricalOrder {
  return {
    id,
    strategy: 'MANUAL',
    type: 'MARKET',
    ticker,
    quantity,
    filledQuantity: quantity,
    value: walletValue,
    filledValue: walletValue,
    limitPrice: null,
    status: fills?.length === 0 ? 'CANCELLED' : 'FILLED',
    currency: priceCurrency,
    extendedHours: false,
    initiatedFrom: 'API',
    side,
    createdAt: filledAt,
    instrument: { ticker, name, isin, currency: priceCurrency },
    fills: fills ?? [
      {
        id: fillId,
        quantity,
        price,
        type: 'TRADE',
        tradingMethod: 'OTC',
        filledAt,
        walletImpact: {
          currency: 'GBP',
          netValue: walletValue,
          fxRate: 1,
          taxes,
        },
      },
    ],
  };
}
