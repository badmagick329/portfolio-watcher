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
      alphaMarketReturn: 0,
      alphaRiskFreeAnnual: 0.04,
      mode: 'allocation',
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
      hideValues: false,
    });
  });

  test('defaults invalid or missing mode to manage', () => {
    expect(getCategoriesViewUrlState(new URLSearchParams()).mode).toBe(
      'manage',
    );
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
      alphaMarketReturn: 0,
      alphaRiskFreeAnnual: 0.04,
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
        alphaMarketReturn: 0,
        alphaRiskFreeAnnual: 0.04,
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

  test('parses valid alpha inputs', () => {
    const state = getCategoriesViewUrlState(
      new URLSearchParams(
        'mode=allocation&alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045',
      ),
    );

    expect(state.alphaMarketReturn).toBe(0.08);
    expect(state.alphaRiskFreeAnnual).toBe(0.045);
  });

  test('falls back to alpha defaults for invalid inputs', () => {
    const state = getCategoriesViewUrlState(
      new URLSearchParams('alphaMarketReturn=bad&alphaRiskFreeAnnual=-1.5'),
    );

    expect(state.alphaMarketReturn).toBe(0);
    expect(state.alphaRiskFreeAnnual).toBe(0.04);
  });

  test('preserves alpha inputs when applying updates', () => {
    const searchParams = getSearchParamsWithUpdatedCategoriesViewUrlState(
      new URLSearchParams(
        'mode=allocation&alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045',
      ),
      {
        filledFrom: '2026-04-01',
      },
    );

    expect(searchParams.toString()).toBe(
      'mode=allocation&alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045&filledFrom=2026-04-01',
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
      getCategoriesViewUrlState(new URLSearchParams('hideValues=true'))
        .hideValues,
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
