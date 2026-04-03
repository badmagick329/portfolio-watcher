import { describe, expect, test } from 'vitest';
import type { WebHistoricalOrder } from '@portfolio/domain';

import {
  filterOrdersByFilledDateRange,
} from '../fill-date-filter';
import {
  getOrdersViewUrlState,
  getSearchParamsWithUpdatedOrdersViewUrlState,
} from '../orders-view-url-state';

const createOrder = (
  filledAt: string,
  overrides: Partial<WebHistoricalOrder> = {},
): WebHistoricalOrder => ({
  id: 1,
  strategy: 'manual',
  type: 'MARKET',
  ticker: 'AAA_EQ',
  quantity: 1,
  filledQuantity: 1,
  value: -10,
  filledValue: -10,
  limitPrice: null,
  status: 'FILLED',
  currency: 'USD',
  extendedHours: false,
  initiatedFrom: 'WEB',
  side: 'BUY',
  createdAt: '2026-04-01T10:00:00.000Z',
  instrument: {
    ticker: 'AAA_EQ',
    name: 'AAA',
    isin: 'US001',
    currency: 'USD',
  },
  fills: [
    {
      id: 1,
      quantity: 1,
      price: 10,
      type: 'FILL',
      tradingMethod: 'MARKET',
      filledAt,
      walletImpact: {
        currency: 'GBP',
        netValue: -10,
        fxRate: 1,
        taxes: [],
      },
    },
  ],
  ...overrides,
});

describe('fill date filter', () => {
  test('keeps orders whose fills fall inside the selected date range', () => {
    const result = filterOrdersByFilledDateRange(
      [
        createOrder('2026-04-01T10:00:00.000Z'),
        createOrder('2026-04-03T10:00:00.000Z', { id: 2, ticker: 'BBB_EQ' }),
      ],
      {
        filledFrom: '2026-04-01',
        filledTo: '2026-04-02',
      },
    );

    expect(result.map((order) => order.ticker)).toEqual(['AAA_EQ']);
  });

  test('treats the date boundaries as inclusive', () => {
    const result = filterOrdersByFilledDateRange(
      [createOrder('2026-01-02T23:59:59.000Z')],
      {
        filledFrom: '2026-01-02',
        filledTo: '2026-01-02',
      },
    );

    expect(result).toHaveLength(1);
  });

  test('trims partially matched orders down to fills inside the range', () => {
    const result = filterOrdersByFilledDateRange(
      [
        createOrder('2026-04-01T10:00:00.000Z', {
          fills: [
            {
              id: 1,
              quantity: 1,
              price: 10,
              type: 'FILL',
              tradingMethod: 'MARKET',
              filledAt: '2026-04-01T10:00:00.000Z',
              walletImpact: {
                currency: 'GBP',
                netValue: -10,
                fxRate: 1,
                taxes: [],
              },
            },
            {
              id: 2,
              quantity: 2,
              price: 11,
              type: 'FILL',
              tradingMethod: 'MARKET',
              filledAt: '2026-04-05T10:00:00.000Z',
              walletImpact: {
                currency: 'GBP',
                netValue: -22,
                fxRate: 1,
                taxes: [],
              },
            },
          ],
        }),
      ],
      {
        filledFrom: '2026-04-01',
        filledTo: '2026-04-02',
      },
    );

    expect(result[0]?.fills).toHaveLength(1);
    expect(result[0]?.quantity).toBe(1);
    expect(result[0]?.filledValue).toBe(-10);
  });

  test('returns all orders when the range is cleared', () => {
    const orders = [
      createOrder('2026-04-01T10:00:00.000Z'),
      createOrder('2026-04-03T10:00:00.000Z', { id: 2, ticker: 'BBB_EQ' }),
    ];

    expect(filterOrdersByFilledDateRange(orders, {})).toEqual(orders);
  });

  test('reads valid range values from search params', () => {
    const filter = getOrdersViewUrlState(
      new URLSearchParams('filledFrom=2026-04-01&filledTo=2026-04-03'),
    );

    expect(filter).toEqual({
      mode: 'include',
      selectedIsins: [],
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
      page: 1,
    });
  });

  test('updates search params and preserves unrelated values', () => {
    const nextSearchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      new URLSearchParams('mode=include&filledFrom=2026-04-01'),
      {
        filledFrom: '2026-04-02',
        filledTo: '2026-04-03',
      },
    );

    expect(nextSearchParams.toString()).toBe(
      'mode=include&filledFrom=2026-04-02&filledTo=2026-04-03&page=1',
    );
  });

  test('removes date params when the range is cleared', () => {
    const nextSearchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      new URLSearchParams('mode=include&filledFrom=2026-04-01&filledTo=2026-04-03'),
      {
        filledFrom: undefined,
        filledTo: undefined,
      },
    );

    expect(nextSearchParams.toString()).toBe('mode=include&page=1');
  });
});
