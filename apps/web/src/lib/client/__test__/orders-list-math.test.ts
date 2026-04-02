import { describe, expect, test } from 'vitest';
import type { WebHistoricalOrder } from '@portfolio/domain';
import type { InstrumentStoredPrice } from '../instrument-price';
import { buildOrdersSummary } from '../orders-list-math';

const createOrder = (
  overrides: Partial<WebHistoricalOrder> = {},
): WebHistoricalOrder => ({
  id: 1,
  strategy: 'manual',
  type: 'MARKET',
  ticker: 'AMD_US_EQ',
  quantity: 10,
  filledQuantity: 10,
  value: 1000,
  filledValue: 1000,
  limitPrice: null,
  status: 'FILLED',
  currency: 'USD',
  extendedHours: false,
  initiatedFrom: 'WEB',
  side: 'BUY',
  createdAt: '2026-03-24T12:00:00.000Z',
  instrument: {
    ticker: 'AMD_US_EQ',
    name: 'Advanced Micro Devices',
    isin: 'US0079031078',
    currency: 'USD',
  },
  fills: [
    {
      id: 1,
      quantity: 10,
      price: 100,
      type: 'FILL',
      tradingMethod: 'MARKET',
      filledAt: '2026-03-24T12:00:00.000Z',
      walletImpact: {
        currency: 'USD',
        netValue: -1000,
        fxRate: 1,
        taxes: [],
      },
    },
  ],
  ...overrides,
});

describe('buildOrdersSummary', () => {
  test('uses stored price when it is newer than the latest fill timestamp', () => {
    const storedPrice: InstrumentStoredPrice = {
      price: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    };

    const summary = buildOrdersSummary([createOrder()], storedPrice);

    expect(summary.fallbackInstrumentPrice).toEqual({
      source: 'stored',
      value: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    });
    expect(summary.instrumentPriceUsed).toBe(120);
    expect(summary.manualPriceInput).toBe('120');
  });

  test('falls back to the latest fill-derived price when stored price is older', () => {
    const storedPrice: InstrumentStoredPrice = {
      price: 120,
      currency: 'USD',
      asOf: '2026-03-23T00:00:00.000Z',
      priceType: 'eod',
    };

    const summary = buildOrdersSummary([createOrder()], storedPrice);

    expect(summary.fallbackInstrumentPrice).toEqual({
      source: 'derived_from_fill',
      value: 100,
      currency: 'USD',
      asOf: '2026-03-24T12:00:00.000Z',
      priceType: undefined,
    });
    expect(summary.instrumentPriceUsed).toBe(100);
  });

  test('ignores stored price when the currency does not match', () => {
    const storedPrice: InstrumentStoredPrice = {
      price: 120,
      currency: 'EUR',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    };

    const summary = buildOrdersSummary([createOrder()], storedPrice);

    expect(summary.fallbackInstrumentPrice?.source).toBe('derived_from_fill');
    expect(summary.instrumentPriceUsed).toBe(100);
  });

  test('manual input overrides both stored and fill-derived prices', () => {
    const storedPrice: InstrumentStoredPrice = {
      price: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    };

    const summary = buildOrdersSummary([createOrder()], storedPrice, '130');

    expect(summary.effectiveInstrumentPrice).toEqual({
      source: 'manual',
      value: 130,
      currency: 'USD',
    });
    expect(summary.instrumentPriceUsed).toBe(130);
  });

  test('a saved manual price becomes the stored fallback after the input is cleared', () => {
    const savedManualPrice: InstrumentStoredPrice = {
      price: 130,
      currency: 'USD',
      asOf: '2026-04-02T10:15:00.000Z',
      priceType: 'manual',
    };

    const summary = buildOrdersSummary([createOrder()], savedManualPrice, '');

    expect(summary.fallbackInstrumentPrice).toEqual({
      source: 'stored',
      value: 130,
      currency: 'USD',
      asOf: '2026-04-02T10:15:00.000Z',
      priceType: 'manual',
    });
    expect(summary.instrumentPriceUsed).toBe(130);
    expect(summary.manualPriceInput).toBe('130');
  });
});
