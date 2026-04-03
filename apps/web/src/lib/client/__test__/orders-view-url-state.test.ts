import { describe, expect, test } from 'vitest';

import {
  getOrdersViewUrlState,
  getSearchParamsWithOrdersViewUrlState,
  getSearchParamsWithUpdatedOrdersViewUrlState,
} from '../orders-view-url-state';

describe('orders view url state', () => {
  test('parses valid mode, selected isins, and fill date range', () => {
    const state = getOrdersViewUrlState(
      new URLSearchParams(
        'mode=exclude&isins=US001,US002&filledFrom=2026-04-01&filledTo=2026-04-03',
      ),
    );

    expect(state).toEqual({
      mode: 'exclude',
      selectedIsins: ['US001', 'US002'],
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
    });
  });

  test('defaults invalid mode to include', () => {
    const state = getOrdersViewUrlState(
      new URLSearchParams('mode=something-else'),
    );

    expect(state.mode).toBe('include');
  });

  test('drops empty and duplicate isins', () => {
    const state = getOrdersViewUrlState(
      new URLSearchParams('isins=US001,,US002,US001'),
    );

    expect(state.selectedIsins).toEqual(['US001', 'US002']);
  });

  test('ignores invalid dates', () => {
    const state = getOrdersViewUrlState(
      new URLSearchParams('filledFrom=bad-value&filledTo=2026-13-40'),
    );

    expect(state).toEqual({
      mode: 'include',
      selectedIsins: [],
      filledFrom: undefined,
      filledTo: undefined,
    });
  });

  test('serializes state to the expected query params', () => {
    const searchParams = getSearchParamsWithOrdersViewUrlState(
      new URLSearchParams('foo=bar'),
      {
        mode: 'all',
        selectedIsins: ['US001', 'US002'],
        filledFrom: '2026-04-01',
        filledTo: '2026-04-03',
      },
    );

    expect(searchParams.toString()).toBe(
      'foo=bar&mode=all&isins=US001%2CUS002&filledFrom=2026-04-01&filledTo=2026-04-03',
    );
  });

  test('preserves unrelated params when applying updates', () => {
    const searchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      new URLSearchParams('foo=bar&mode=include'),
      {
        mode: 'exclude',
        selectedIsins: ['US003'],
      },
    );

    expect(searchParams.toString()).toBe('foo=bar&mode=exclude&isins=US003');
  });

  test('keeps selected isins when switching to all mode', () => {
    const searchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      new URLSearchParams('mode=include&isins=US001%2CUS002'),
      {
        mode: 'all',
      },
    );

    expect(searchParams.toString()).toBe('mode=all&isins=US001%2CUS002');
  });
});
