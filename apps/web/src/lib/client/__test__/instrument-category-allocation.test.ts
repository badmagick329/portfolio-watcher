import { describe, expect, test } from 'vitest';
import type { WebHistoricalOrder } from '@portfolio/domain';
import type { CategorizedInstrumentWithPosition } from '../instrument-category-allocation';
import { buildCategoryAllocationViewModel } from '../instrument-category-allocation';

const instrument = (
  input: Partial<CategorizedInstrumentWithPosition>,
): CategorizedInstrumentWithPosition => ({
  ticker: 'AAPL',
  name: 'Apple Inc.',
  isin: 'US0378331005',
  currency: 'USD',
  category: 'growth',
  currentPositionSnapshot: {
    isin: 'US0378331005',
    providerSymbol: 'AAPL',
    quantity: 1,
    currentPrice: 100,
    instrumentCurrency: 'USD',
    walletCurrency: 'GBP',
    currentValue: 100,
    totalCost: 80,
    unrealizedProfitLoss: 20,
    fxImpact: null,
    asOf: '2026-04-16T10:00:00.000Z',
    fetchedAt: '2026-04-16T10:00:00.000Z',
  },
  ...input,
});

describe('buildCategoryAllocationViewModel', () => {
  test('groups holdings by category and calculates allocation and return', () => {
    const result = buildCategoryAllocationViewModel({
      instruments: [
        instrument({ category: 'growth' }),
        instrument({
          category: 'growth',
          isin: 'US5949181045',
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            isin: 'US5949181045',
            currentValue: 300,
            totalCost: 320,
            unrealizedProfitLoss: -20,
          },
        }),
        instrument({
          category: 'defensive',
          isin: 'IE00B3XXRP09',
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            isin: 'IE00B3XXRP09',
            currentValue: 100,
            totalCost: 100,
            unrealizedProfitLoss: 0,
          },
        }),
      ],
    });

    expect(result.totalCurrentValue).toBe(500);
    expect(result.rows).toEqual([
      {
        category: 'growth',
        holdingCount: 2,
        currentValue: 400,
        totalCost: 400,
        unrealizedPnl: 0,
        allocationPercent: 0.8,
        returnPercent: 0,
      },
      {
        category: 'defensive',
        holdingCount: 1,
        currentValue: 100,
        totalCost: 100,
        unrealizedPnl: 0,
        allocationPercent: 0.2,
        returnPercent: 0,
      },
    ]);
  });

  test('uses uncategorized label', () => {
    const result = buildCategoryAllocationViewModel({
      instruments: [instrument({ category: null })],
    });

    expect(result.rows[0]?.category).toBe('Uncategorized');
  });

  test('preserves negative return percentage', () => {
    const result = buildCategoryAllocationViewModel({
      instruments: [
        instrument({
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            currentValue: 80,
            totalCost: 100,
            unrealizedProfitLoss: -20,
          },
        }),
      ],
    });

    expect(result.rows[0]?.returnPercent).toBe(-0.2);
  });

  test('excludes zero and negative quantity positions', () => {
    const result = buildCategoryAllocationViewModel({
      instruments: [
        instrument({
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            quantity: 0,
          },
        }),
        instrument({
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            quantity: -1,
          },
        }),
      ],
    });

    expect(result.rows).toEqual([]);
    expect(result.hasCurrentHoldings).toBe(false);
  });

  test('handles zero total cost and no snapshots', () => {
    const zeroCost = buildCategoryAllocationViewModel({
      instruments: [
        instrument({
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            totalCost: 0,
          },
        }),
      ],
    });

    expect(zeroCost.rows[0]?.returnPercent).toBeNull();

    const noSnapshots = buildCategoryAllocationViewModel({
      instruments: [instrument({ currentPositionSnapshot: null })],
    });

    expect(noSnapshots.hasPositionSnapshots).toBe(false);
  });

  test('historical mode groups filtered orders by category and net invested', () => {
    const result = buildCategoryAllocationViewModel({
      fillDateRangeFilter: {
        filledFrom: '2026-04-01',
        filledTo: '2026-04-30',
      },
      historicalOrders: [
        historicalOrder({
          isin: 'US0378331005',
          side: 'BUY',
          walletNetValue: -100,
        }),
        historicalOrder({
          isin: 'US0378331005',
          side: 'SELL',
          walletNetValue: 60,
          quantity: 0.5,
        }),
        historicalOrder({
          isin: 'US5949181045',
          side: 'BUY',
          walletNetValue: -200,
        }),
      ],
      instruments: [
        instrument({
          category: 'satellite',
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            currentValue: 120,
            quantity: 1,
          },
        }),
        instrument({
          category: 'index',
          isin: 'US5949181045',
          currentPositionSnapshot: {
            ...instrument({}).currentPositionSnapshot!,
            currentValue: 190,
            isin: 'US5949181045',
            quantity: 1,
          },
        }),
      ],
    });

    expect(result.mode).toBe('historical');
    expect(result.totalCurrentValue).toBe(240);
    expect(result.rows).toEqual([
      expect.objectContaining({
        category: 'index',
        buyCost: 200,
        currentValue: 200,
        netInvested: 200,
        returnPercent: -0.05,
        sellProceeds: 0,
        unrealizedPnl: -10,
      }),
      expect.objectContaining({
        category: 'satellite',
        buyCost: 100,
        currentValue: 40,
        netInvested: 40,
        returnPercent: 0.2,
        sellProceeds: 60,
        unrealizedPnl: 20,
      }),
    ]);
  });

  test('historical mode preserves net withdrawals without showing sell-only gains', () => {
    const result = buildCategoryAllocationViewModel({
      fillDateRangeFilter: {
        filledFrom: '2026-04-01',
        filledTo: '2026-04-30',
      },
      historicalOrders: [
        historicalOrder({
          isin: 'US0378331005',
          side: 'SELL',
          walletNetValue: 75,
        }),
      ],
      instruments: [instrument({ category: 'growth' })],
    });

    expect(result.totalCurrentValue).toBe(-75);
    expect(result.rows).toEqual([
      expect.objectContaining({
        category: 'growth',
        buyCost: 0,
        currentValue: -75,
        netInvested: -75,
        returnPercent: null,
        sellProceeds: 75,
        unrealizedPnl: null,
      }),
    ]);
  });

  test('historical mode returns empty state for empty filtered range', () => {
    const result = buildCategoryAllocationViewModel({
      fillDateRangeFilter: {
        filledFrom: '2026-05-01',
        filledTo: '2026-05-31',
      },
      historicalOrders: [
        historicalOrder({
          filledAt: '2026-04-10T10:00:00.000Z',
          isin: 'US0378331005',
          side: 'BUY',
          walletNetValue: -100,
        }),
      ],
      instruments: [instrument({})],
    });

    expect(result.rows).toEqual([]);
    expect(result.hasFilteredOrders).toBe(false);
  });
});

const historicalOrder = ({
  filledAt = '2026-04-10T10:00:00.000Z',
  isin,
  quantity = 1,
  side,
  walletNetValue,
}: {
  filledAt?: string;
  isin: string;
  quantity?: number;
  side: 'BUY' | 'SELL';
  walletNetValue: number;
}) =>
  ({
    id: Math.random(),
    strategy: 'MANUAL',
    type: 'MARKET',
    ticker: isin,
    quantity,
    filledQuantity: quantity,
    value: walletNetValue,
    filledValue: walletNetValue,
    limitPrice: null,
    status: 'FILLED',
    currency: 'GBP',
    extendedHours: false,
    initiatedFrom: 'WEB',
    side,
    createdAt: filledAt,
    instrument: {
      ticker: isin,
      name: isin,
      isin,
      currency: 'GBP',
    },
    fills: [
      {
        id: Math.random(),
        quantity,
        price: Math.abs(walletNetValue) / quantity,
        type: 'MARKET',
        tradingMethod: 'CLASSIC',
        filledAt,
        walletImpact: {
          currency: 'GBP',
          fxRate: 1,
          netValue: walletNetValue,
          taxes: [],
        },
      },
    ],
  }) satisfies WebHistoricalOrder;
