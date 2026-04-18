import { describe, expect, test } from 'vitest';

import {
  getCategoriesViewUrlState,
  getSearchParamsWithCategoriesViewUrlState,
  getSearchParamsWithUpdatedCategoriesViewUrlState,
} from '../../categories/categories-view-url-state';

describe('categories view url state', () => {
  test('parses valid mode and fill date range', () => {
    const state = getCategoriesViewUrlState(
      new URLSearchParams(
        'mode=allocation&filledFrom=2026-04-01&filledTo=2026-04-03',
      ),
    );

    expect(state).toEqual({
      mode: 'allocation',
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
      hideValues: false,
    });
  });

  test('defaults invalid or missing mode to manage', () => {
    expect(getCategoriesViewUrlState(new URLSearchParams()).mode).toBe('manage');
    expect(
      getCategoriesViewUrlState(new URLSearchParams('mode=other')).mode,
    ).toBe('manage');
  });

  test('ignores invalid dates', () => {
    const state = getCategoriesViewUrlState(
      new URLSearchParams(
        'mode=allocation&filledFrom=bad-value&filledTo=2026-13-40',
      ),
    );

    expect(state).toEqual({
      mode: 'allocation',
      filledFrom: undefined,
      filledTo: undefined,
      hideValues: false,
    });
  });

  test('serializes state to expected query params', () => {
    const searchParams = getSearchParamsWithCategoriesViewUrlState(
      new URLSearchParams('foo=bar'),
      {
        mode: 'allocation',
        filledFrom: '2026-04-01',
        filledTo: '2026-04-03',
        hideValues: true,
      },
    );

    expect(searchParams.toString()).toBe(
      'foo=bar&mode=allocation&filledFrom=2026-04-01&filledTo=2026-04-03&hideValues=1',
    );
  });

  test('preserves unrelated params when applying updates', () => {
    const searchParams = getSearchParamsWithUpdatedCategoriesViewUrlState(
      new URLSearchParams('foo=bar&mode=manage'),
      {
        mode: 'allocation',
        filledFrom: '2026-04-01',
      },
    );

    expect(searchParams.toString()).toBe(
      'foo=bar&mode=allocation&filledFrom=2026-04-01',
    );
  });

  test('clears dates when values are unset', () => {
    const searchParams = getSearchParamsWithUpdatedCategoriesViewUrlState(
      new URLSearchParams(
        'mode=allocation&filledFrom=2026-04-01&filledTo=2026-04-03',
      ),
      {
        filledFrom: undefined,
        filledTo: undefined,
      },
    );

    expect(searchParams.toString()).toBe('mode=allocation');
  });

  test('parses and clears hidden values mode', () => {
    expect(
      getCategoriesViewUrlState(new URLSearchParams('hideValues=1')).hideValues,
    ).toBe(true);
    expect(
      getCategoriesViewUrlState(new URLSearchParams('hideValues=true')).hideValues,
    ).toBe(false);

    const searchParams = getSearchParamsWithUpdatedCategoriesViewUrlState(
      new URLSearchParams('mode=allocation&hideValues=1'),
      {
        hideValues: false,
      },
    );

    expect(searchParams.toString()).toBe('mode=allocation');
  });
});
