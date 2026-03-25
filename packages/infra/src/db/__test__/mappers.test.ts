import { describe, expect, test } from 'bun:test';
import type { FillTaxRow, HistoricalOrderRow } from '../types';
import { mapDbHistoricalOrdersToWeb } from '../mappers';

const baseOrderRow: HistoricalOrderRow = {
  orderId: 1,
  strategy: 'MANUAL',
  type: 'LIMIT',
  ticker: 'AAPL',
  quantity: null,
  filledQuantity: null,
  value: null,
  filledValue: null,
  limitPrice: null,
  status: 'OPEN',
  currency: 'USD',
  extendedHours: false,
  initiatedFrom: 'WEB',
  side: 'BUY',
  createdAt: '2024-01-02T10:00:00Z',
  instrumentTicker: 'AAPL',
  instrumentName: 'Apple Inc.',
  instrumentIsin: 'US0378331005',
  instrumentCurrency: 'USD',
  fillId: null,
  fillQuantity: null,
  fillPrice: null,
  fillType: null,
  fillTradingMethod: null,
  fillFilledAt: null,
  fillWalletCurrency: null,
  fillWalletNetValue: null,
  fillWalletFxRate: null,
};

describe('mapDbHistoricalOrdersToWeb', () => {
  test('maps an order with no fills to an empty fills array and preserves null numeric fields', () => {
    const result = mapDbHistoricalOrdersToWeb([baseOrderRow], []);

    expect(result).toEqual({
      items: [
        {
          id: 1,
          strategy: 'MANUAL',
          type: 'LIMIT',
          ticker: 'AAPL',
          quantity: null,
          filledQuantity: null,
          value: null,
          filledValue: null,
          limitPrice: null,
          status: 'OPEN',
          currency: 'USD',
          extendedHours: false,
          initiatedFrom: 'WEB',
          side: 'BUY',
          createdAt: '2024-01-02T10:00:00Z',
          instrument: {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            isin: 'US0378331005',
            currency: 'USD',
          },
          fills: [],
        },
      ],
      filters: {},
    });
  });

  test('maps one fill, nests taxes, and backfills missing quantities and values from fills', () => {
    const orderRows: HistoricalOrderRow[] = [
      {
        ...baseOrderRow,
        fillId: 10,
        fillQuantity: 2,
        fillPrice: 100,
        fillType: 'LIMIT',
        fillTradingMethod: 'CLASSIC',
        fillFilledAt: '2024-01-02T10:05:00Z',
        fillWalletCurrency: 'USD',
        fillWalletNetValue: 200,
        fillWalletFxRate: 1,
      },
    ];

    const taxRows: FillTaxRow[] = [
      {
        fillId: 10,
        name: 'Stamp duty',
        quantity: 1.5,
        currency: 'USD',
        chargedAt: '2024-01-02T10:05:00Z',
      },
    ];

    const result = mapDbHistoricalOrdersToWeb(orderRows, taxRows, {
      ticker: 'AAPL',
    });

    expect(result).toEqual({
      items: [
        {
          id: 1,
          strategy: 'MANUAL',
          type: 'LIMIT',
          ticker: 'AAPL',
          quantity: 2,
          filledQuantity: 2,
          value: 200,
          filledValue: 200,
          limitPrice: null,
          status: 'OPEN',
          currency: 'USD',
          extendedHours: false,
          initiatedFrom: 'WEB',
          side: 'BUY',
          createdAt: '2024-01-02T10:00:00Z',
          instrument: {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            isin: 'US0378331005',
            currency: 'USD',
          },
          fills: [
            {
              id: 10,
              quantity: 2,
              price: 100,
              type: 'LIMIT',
              tradingMethod: 'CLASSIC',
              filledAt: '2024-01-02T10:05:00Z',
              walletImpact: {
                currency: 'USD',
                netValue: 200,
                fxRate: 1,
                taxes: [
                  {
                    name: 'Stamp duty',
                    quantity: 1.5,
                    currency: 'USD',
                    chargedAt: '2024-01-02T10:05:00Z',
                  },
                ],
              },
            },
          ],
        },
      ],
      filters: {
        ticker: 'AAPL',
      },
    });
  });

  test('collapses multiple rows for the same order into one order with multiple fills', () => {
    const result = mapDbHistoricalOrdersToWeb(
      [
        {
          ...baseOrderRow,
          fillId: 10,
          fillQuantity: 1,
          fillPrice: 99,
          fillType: 'LIMIT',
          fillTradingMethod: 'CLASSIC',
          fillFilledAt: '2024-01-02T10:05:00Z',
          fillWalletCurrency: 'USD',
          fillWalletNetValue: 99,
          fillWalletFxRate: 1,
        },
        {
          ...baseOrderRow,
          fillId: 11,
          fillQuantity: 1,
          fillPrice: 101,
          fillType: 'LIMIT',
          fillTradingMethod: 'CLASSIC',
          fillFilledAt: '2024-01-02T10:06:00Z',
          fillWalletCurrency: 'USD',
          fillWalletNetValue: 101,
          fillWalletFxRate: 1,
        },
      ],
      [],
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.quantity).toBe(2);
    expect(result.items[0]?.filledQuantity).toBe(2);
    expect(result.items[0]?.value).toBe(200);
    expect(result.items[0]?.filledValue).toBe(200);
    expect(result.items[0]?.fills).toEqual([
      {
        id: 10,
        quantity: 1,
        price: 99,
        type: 'LIMIT',
        tradingMethod: 'CLASSIC',
        filledAt: '2024-01-02T10:05:00Z',
        walletImpact: {
          currency: 'USD',
          netValue: 99,
          fxRate: 1,
          taxes: [],
        },
      },
      {
        id: 11,
        quantity: 1,
        price: 101,
        type: 'LIMIT',
        tradingMethod: 'CLASSIC',
        filledAt: '2024-01-02T10:06:00Z',
        walletImpact: {
          currency: 'USD',
          netValue: 101,
          fxRate: 1,
          taxes: [],
        },
      },
    ]);
  });
});
