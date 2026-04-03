import { describe, expect, test } from 'vitest';
import type { WebHistoricalOrder } from '@portfolio/domain';
import type { InstrumentStoredPrice, InstrumentWithStoredPrice } from '../instrument-price';
import {
  buildMultiOrdersSummary,
  buildOrdersSummary,
  getLatestFxByCurrency,
} from '../orders-list-math';

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
      provider: 'eodhd',
      price: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    };

    const summary = buildOrdersSummary([createOrder()], storedPrice);

    expect(summary.fallbackInstrumentPrice).toEqual({
      source: 'stored',
      provider: 'eodhd',
      value: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    });
    expect(summary.instrumentPriceUsed).toBe(120);
    expect(summary.manualPriceInput).toBe('120');
    expect(summary.currentPrice).toEqual({
      source: 'stored',
      provider: 'eodhd',
      value: 120,
      currency: 'USD',
      asOf: '2026-03-25T00:00:00.000Z',
      priceType: 'eod',
    });
    expect(summary.currentValue).toBe(1200);
    expect(summary.averageCost).toBe(100);
    expect(summary.costBasis).toBe(1000);
    expect(summary.unrealizedPnL).toBe(200);
    expect(summary.unrealizedPnLPercent).toBe(0.2);
  });

  test('falls back to the latest fill-derived price when stored price is older', () => {
    const storedPrice: InstrumentStoredPrice = {
      provider: 'eodhd',
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
      provider: 'eodhd',
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
      provider: 'eodhd',
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
    expect(summary.currentPrice?.source).toBe('manual');
    expect(summary.currentValue).toBe(1300);
  });

  test('uses the latest observed fx for the instrument currency across all orders', () => {
    const summary = buildOrdersSummary([
      createOrder({
        id: 1,
        fills: [
          {
            id: 1,
            quantity: 10,
            price: 100,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-03-20T12:00:00.000Z',
            walletImpact: {
              currency: 'GBP',
              netValue: -1000,
              fxRate: 2,
              taxes: [],
            },
          },
        ],
      }),
      createOrder({
        id: 2,
        ticker: 'MSFT_US_EQ',
        instrument: {
          ticker: 'MSFT_US_EQ',
          name: 'Microsoft',
          isin: 'US5949181045',
          currency: 'USD',
        },
        fills: [
          {
            id: 2,
            quantity: 1,
            price: 200,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-03-25T12:00:00.000Z',
            walletImpact: {
              currency: 'GBP',
              netValue: -100,
              fxRate: 4,
              taxes: [],
            },
          },
        ],
      }),
    ]);

    expect(summary.estimatedCurrentValue).toBe(750);
  });

  test('a saved manual price becomes the stored fallback after the input is cleared', () => {
    const savedManualPrice: InstrumentStoredPrice = {
      provider: 'manual',
      price: 130,
      currency: 'USD',
      asOf: '2026-04-02T10:15:00.000Z',
      priceType: 'manual',
    };

    const summary = buildOrdersSummary([createOrder()], savedManualPrice, '');

    expect(summary.fallbackInstrumentPrice).toEqual({
      source: 'stored',
      provider: 'manual',
      value: 130,
      currency: 'USD',
      asOf: '2026-04-02T10:15:00.000Z',
      priceType: 'manual',
    });
    expect(summary.instrumentPriceUsed).toBe(130);
    expect(summary.manualPriceInput).toBe('130');
  });

  test('calculates weighted-average cost basis across buys and sells', () => {
    const summary = buildOrdersSummary([
      createOrder({
        id: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        filledValue: 1000,
        value: 1000,
        filledQuantity: 10,
        quantity: 10,
        fills: [
          {
            id: 1,
            quantity: 10,
            price: 100,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-01-01T00:00:00.000Z',
            walletImpact: {
              currency: 'USD',
              netValue: -1000,
              fxRate: 1,
              taxes: [],
            },
          },
        ],
      }),
      createOrder({
        id: 2,
        createdAt: '2026-01-02T00:00:00.000Z',
        filledValue: 600,
        value: 600,
        filledQuantity: 5,
        quantity: 5,
        fills: [
          {
            id: 2,
            quantity: 5,
            price: 120,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-01-02T00:00:00.000Z',
            walletImpact: {
              currency: 'USD',
              netValue: -600,
              fxRate: 1,
              taxes: [],
            },
          },
        ],
      }),
      createOrder({
        id: 3,
        side: 'SELL',
        createdAt: '2026-01-03T00:00:00.000Z',
        filledValue: 330,
        value: 330,
        filledQuantity: 3,
        quantity: 3,
        fills: [
          {
            id: 3,
            quantity: 3,
            price: 110,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-01-03T00:00:00.000Z',
            walletImpact: {
              currency: 'USD',
              netValue: 330,
              fxRate: 1,
              taxes: [],
            },
          },
        ],
      }),
    ]);

    expect(summary.remainingQuantity).toBe(12);
    expect(summary.costBasis).toBeCloseTo(1280);
    expect(summary.averageCost).toBeCloseTo(106.6666666667);
  });

  test('hides position-only metrics when no holding remains', () => {
    const summary = buildOrdersSummary([
      createOrder({
        side: 'SELL',
        filledValue: 1000,
        value: 1000,
      }),
    ]);

    expect(summary.remainingQuantity).toBe(-10);
    expect(summary.currentValue).toBeNull();
    expect(summary.averageCost).toBeNull();
    expect(summary.costBasis).toBeNull();
    expect(summary.unrealizedPnL).toBeNull();
    expect(summary.unrealizedPnLPercent).toBeNull();
  });

  test('builds an aggregate summary across multiple selected instruments', () => {
    const metaOrder = createOrder();
    const appleOrder = createOrder({
      id: 2,
      ticker: 'AAPL_US_EQ',
      value: 2000,
      filledValue: 2000,
      instrument: {
        ticker: 'AAPL_US_EQ',
        name: 'Apple',
        isin: 'US0378331005',
        currency: 'USD',
      },
      fills: [
        {
          id: 2,
          quantity: 10,
          price: 200,
          type: 'FILL',
          tradingMethod: 'MARKET',
          filledAt: '2026-03-26T12:00:00.000Z',
          walletImpact: {
            currency: 'USD',
            netValue: -2000,
            fxRate: 2,
            taxes: [],
          },
        },
      ],
    });
    const selectedInstruments: InstrumentWithStoredPrice[] = [
      {
        ...metaOrder.instrument,
        latestStoredPrice: {
          provider: 'eodhd',
          price: 120,
          currency: 'USD',
          asOf: '2026-03-25T00:00:00.000Z',
          priceType: 'eod',
        },
      },
      {
        ...appleOrder.instrument,
        latestStoredPrice: null,
      },
    ];

    const summary = buildMultiOrdersSummary(
      [metaOrder, appleOrder],
      selectedInstruments,
    );

    expect(summary.estimatedPositionValue).toBe(1600);
    expect(summary.estimatedCurrentValue).toBe(1500);
    expect(summary.estimatedTotal).toBe(-1400);
    expect(summary.instrumentPriceUsed).toBeNull();
    expect(summary.effectiveInstrumentPrice).toBeNull();
    expect(summary.manualPriceInput).toBe('');
    expect(summary.currentPrice).toBeNull();
    expect(summary.currentValue).toBeNull();
  });

  test('manual override still changes only the price, not the selected fx source', () => {
    const latestFxByCurrency = getLatestFxByCurrency([
      createOrder({
        id: 2,
        ticker: 'AAPL_US_EQ',
        instrument: {
          ticker: 'AAPL_US_EQ',
          name: 'Apple',
          isin: 'US0378331005',
          currency: 'USD',
        },
        filledQuantity: 1,
        quantity: 1,
        fills: [
          {
            id: 2,
            quantity: 1,
            price: 150,
            type: 'FILL',
            tradingMethod: 'MARKET',
            filledAt: '2026-03-25T12:00:00.000Z',
            walletImpact: {
              currency: 'GBP',
              netValue: -75,
              fxRate: 4,
              taxes: [],
            },
          },
        ],
      }),
    ]);
    const summary = buildOrdersSummary(
      [
        createOrder({
          id: 1,
          filledQuantity: 10,
          quantity: 10,
          fills: [
            {
              id: 1,
              quantity: 10,
              price: 100,
              type: 'FILL',
              tradingMethod: 'MARKET',
              filledAt: '2026-03-20T12:00:00.000Z',
              walletImpact: {
                currency: 'GBP',
                netValue: -1000,
                fxRate: 2,
                taxes: [],
              },
            },
          ],
        }),
      ],
      null,
      '120',
      latestFxByCurrency,
    );

    expect(summary.currentPrice?.source).toBe('manual');
    expect(summary.estimatedPositionValue).toBe(300);
  });

  test('falls back to instrument-level fx when no broader currency entry exists', () => {
    const order = createOrder({
      fills: [
        {
          id: 1,
          quantity: 10,
          price: 100,
          type: 'FILL',
          tradingMethod: 'MARKET',
          filledAt: '2026-03-24T12:00:00.000Z',
          walletImpact: {
            currency: 'GBP',
            netValue: -500,
            fxRate: 2,
            taxes: [],
          },
        },
      ],
    });

    const latestFxByCurrency = getLatestFxByCurrency([]);
    const summary = buildOrdersSummary([order], null, '', latestFxByCurrency);

    expect(summary.estimatedPositionValue).toBe(500);
  });
});
