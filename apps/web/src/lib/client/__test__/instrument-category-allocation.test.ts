import { describe, expect, test } from 'vitest';
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
    const result = buildCategoryAllocationViewModel([
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
    ]);

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
    const result = buildCategoryAllocationViewModel([
      instrument({ category: null }),
    ]);

    expect(result.rows[0]?.category).toBe('Uncategorized');
  });

  test('preserves negative return percentage', () => {
    const result = buildCategoryAllocationViewModel([
      instrument({
        currentPositionSnapshot: {
          ...instrument({}).currentPositionSnapshot!,
          currentValue: 80,
          totalCost: 100,
          unrealizedProfitLoss: -20,
        },
      }),
    ]);

    expect(result.rows[0]?.returnPercent).toBe(-0.2);
  });

  test('excludes zero and negative quantity positions', () => {
    const result = buildCategoryAllocationViewModel([
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
    ]);

    expect(result.rows).toEqual([]);
    expect(result.hasCurrentHoldings).toBe(false);
  });

  test('handles zero total cost and no snapshots', () => {
    const zeroCost = buildCategoryAllocationViewModel([
      instrument({
        currentPositionSnapshot: {
          ...instrument({}).currentPositionSnapshot!,
          totalCost: 0,
        },
      }),
    ]);

    expect(zeroCost.rows[0]?.returnPercent).toBeNull();

    const noSnapshots = buildCategoryAllocationViewModel([
      instrument({ currentPositionSnapshot: null }),
    ]);

    expect(noSnapshots.hasPositionSnapshots).toBe(false);
  });
});
