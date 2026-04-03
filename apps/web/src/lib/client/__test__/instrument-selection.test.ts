import { describe, expect, test } from 'vitest';
import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  createInstrumentSelection,
  filterOrdersBySelection,
  getActiveInstrumentsFromFilteredOrders,
  setInstrumentSelectionMode,
  toggleInstrumentSelection,
} from '../instrument-selection';
import type { InstrumentWithStoredPrice } from '../instrument-price';

const createOrder = (
  isin: string,
  ticker: string,
  status: WebHistoricalOrder['status'] = 'FILLED',
): WebHistoricalOrder => ({
  id: Number(isin.slice(-1)),
  strategy: 'manual',
  type: 'MARKET',
  ticker,
  quantity: 1,
  filledQuantity: 1,
  value: 10,
  filledValue: 10,
  limitPrice: null,
  status,
  currency: 'GBP',
  extendedHours: false,
  initiatedFrom: 'WEB',
  side: 'BUY',
  createdAt: '2026-04-02T10:00:00.000Z',
  instrument: {
    ticker,
    name: ticker,
    isin,
    currency: 'USD',
  },
  fills: [
    {
      id: 1,
      quantity: 1,
      price: 10,
      type: 'FILL',
      tradingMethod: 'MARKET',
      filledAt: '2026-04-02T10:00:00.000Z',
      walletImpact: {
        currency: 'GBP',
        netValue: -10,
        fxRate: 1,
        taxes: [],
      },
    },
  ],
});

describe('instrument selection', () => {
  test('toggle adds and removes selected isins', () => {
    const afterFirstToggle = toggleInstrumentSelection(
      createInstrumentSelection(),
      'US001',
    );
    const afterSecondToggle = toggleInstrumentSelection(afterFirstToggle, 'US001');

    expect(afterFirstToggle.selectedIsins).toEqual(['US001']);
    expect(afterSecondToggle.selectedIsins).toEqual([]);
  });

  test('single mode keeps only the most recent selection', () => {
    const selection = setInstrumentSelectionMode(
      createInstrumentSelection(['US001']),
      'single',
    );
    const nextSelection = toggleInstrumentSelection(selection, 'US002');

    expect(nextSelection.selectedIsins).toEqual(['US002']);
  });

  test('filters filled orders for all selected instruments', () => {
    const selection = createInstrumentSelection(['US001', 'US002']);
    const orders = [
      createOrder('US001', 'AAA'),
      createOrder('US002', 'BBB'),
      createOrder('US003', 'CCC'),
      createOrder('US002', 'BBB', 'CANCELLED'),
    ];

    expect(filterOrdersBySelection(orders, selection).map((order) => order.ticker)).toEqual([
      'AAA',
      'BBB',
    ]);
  });

  test('include mode returns no orders when there is no active selection', () => {
    const orders = [createOrder('US001', 'AAA')];

    expect(filterOrdersBySelection(orders, createInstrumentSelection())).toEqual([]);
  });

  test('exclude mode returns all filled orders except selected instruments', () => {
    const selection = setInstrumentSelectionMode(
      createInstrumentSelection(['US001']),
      'exclude',
    );
    const orders = [
      createOrder('US001', 'AAA'),
      createOrder('US002', 'BBB'),
      createOrder('US003', 'CCC', 'CANCELLED'),
    ];

    expect(filterOrdersBySelection(orders, selection).map((order) => order.ticker)).toEqual([
      'BBB',
    ]);
  });

  test('single mode returns only the selected filled instrument', () => {
    const selection = setInstrumentSelectionMode(
      createInstrumentSelection(['US002']),
      'single',
    );
    const orders = [
      createOrder('US001', 'AAA'),
      createOrder('US002', 'BBB'),
      createOrder('US003', 'CCC', 'CANCELLED'),
    ];

    expect(filterOrdersBySelection(orders, selection).map((order) => order.ticker)).toEqual([
      'BBB',
    ]);
  });

  test('exclude mode with no selection returns all filled orders', () => {
    const selection = setInstrumentSelectionMode(createInstrumentSelection(), 'exclude');
    const orders = [
      createOrder('US001', 'AAA'),
      createOrder('US002', 'BBB', 'CANCELLED'),
    ];

    expect(filterOrdersBySelection(orders, selection).map((order) => order.ticker)).toEqual([
      'AAA',
    ]);
  });

  test('all mode returns all filled orders regardless of selected set', () => {
    const selection = setInstrumentSelectionMode(
      createInstrumentSelection(['US001']),
      'all',
    );
    const orders = [
      createOrder('US001', 'AAA'),
      createOrder('US002', 'BBB'),
      createOrder('US003', 'CCC', 'CANCELLED'),
    ];

    expect(filterOrdersBySelection(orders, selection).map((order) => order.ticker)).toEqual([
      'AAA',
      'BBB',
    ]);
  });

  test('changing mode preserves the selected isins', () => {
    const selection = createInstrumentSelection(['US001', 'US002']);
    const nextSelection = setInstrumentSelectionMode(selection, 'all');

    expect(nextSelection.selectedIsins).toEqual(['US001', 'US002']);
    expect(nextSelection.mode).toBe('all');
  });

  test('derives active instruments from the filtered result set', () => {
    const instruments: InstrumentWithStoredPrice[] = [
      {
        ticker: 'AAA',
        name: 'AAA',
        isin: 'US001',
        currency: 'USD',
        latestStoredPrice: null,
        latestPositionSnapshot: null,
      },
      {
        ticker: 'BBB',
        name: 'BBB',
        isin: 'US002',
        currency: 'USD',
        latestStoredPrice: null,
        latestPositionSnapshot: null,
      },
    ];
    const filteredOrders = [createOrder('US002', 'BBB')];

    expect(getActiveInstrumentsFromFilteredOrders(instruments, filteredOrders)).toEqual([
      instruments[1],
    ]);
  });
});
