import type { CurrentHoldingMover } from '@portfolio/domain';
import { describe, expect, test } from 'vitest';
import { buildMoversViewModel } from '../../movers/current-holding-movers';
import { formatMoney, formatPercent } from '../../presentation/format-values';

describe('current holding movers view model', () => {
  test('splits, sorts, and paginates gainers and losers by percent', () => {
    const items = [
      mover('small-gain', 0.1, 100),
      mover('big-gain', 0.3, 50),
      mover('small-loss', -0.05, -200),
      mover('big-loss', -0.25, -20),
    ];

    const viewModel = buildMoversViewModel({
      gainersPage: 1,
      items,
      losersPage: 1,
      sort: 'percent',
    });

    expect(viewModel.gainers.rows.map((row) => row.instrument.isin)).toEqual([
      'big-gain',
      'small-gain',
    ]);
    expect(viewModel.losers.rows.map((row) => row.instrument.isin)).toEqual([
      'big-loss',
      'small-loss',
    ]);
  });

  test('splits and sorts by portfolio impact when impact mode is active', () => {
    const items = [
      mover('higher-percent', 0.5, 10),
      mover('higher-impact', 0.1, 100),
      mover('price-gain-impact-loss', 0.4, -5),
      mover('higher-loss-impact', -0.1, -80),
      mover('price-loss-impact-gain', -0.2, 40),
    ];

    const viewModel = buildMoversViewModel({
      gainersPage: 1,
      items,
      losersPage: 1,
      sort: 'impact',
    });

    expect(viewModel.gainers.rows[0]?.instrument.isin).toBe('higher-impact');
    expect(viewModel.gainers.rows.map((row) => row.instrument.isin)).toContain(
      'price-loss-impact-gain',
    );
    expect(viewModel.losers.rows[0]?.instrument.isin).toBe('higher-loss-impact');
    expect(viewModel.losers.rows.map((row) => row.instrument.isin)).toContain(
      'price-gain-impact-loss',
    );
  });

  test('privacy formatting hides money but keeps percentages', () => {
    expect(formatMoney(12.34, { hideValues: true })).toBe('£••••');
    expect(formatPercent(0.123)).toBe('12.3%');
  });
});

const mover = (
  isin: string,
  returnPercent: number,
  walletImpact: number,
): CurrentHoldingMover => ({
  instrument: {
    ticker: isin,
    name: isin,
    isin,
    currency: 'GBP',
    category: null,
  },
  position: {
    isin,
    providerSymbol: isin,
    quantity: 1,
    currentPrice: 1,
    instrumentCurrency: 'GBP',
    walletCurrency: 'GBP',
    currentValue: 1,
    totalCost: 1,
    unrealizedProfitLoss: 0,
    fxImpact: null,
    asOf: '2026-04-10T10:00:00.000Z',
    fetchedAt: '2026-04-10T10:00:00.000Z',
  },
  startPrice: {
    provider: 't212',
    providerSymbol: isin,
    currency: 'GBP',
    price: 1,
    priceType: 'position_current',
    asOf: '2026-04-03T10:00:00.000Z',
    fetchedAt: '2026-04-03T10:00:00.000Z',
  },
  endPrice: {
    provider: 't212',
    providerSymbol: isin,
    currency: 'GBP',
    price: 1 + returnPercent,
    priceType: 'position_current',
    asOf: '2026-04-10T10:00:00.000Z',
    fetchedAt: '2026-04-10T10:00:00.000Z',
  },
  priceChange: returnPercent,
  returnPercent,
  walletImpact,
});
