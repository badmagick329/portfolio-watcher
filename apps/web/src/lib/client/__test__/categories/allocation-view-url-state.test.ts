import { describe, expect, test } from 'vitest';
import {
  getAllocationViewUrlState,
  getSearchParamsWithAllocationViewUrlState,
  getSearchParamsWithUpdatedAllocationViewUrlState,
} from '../../categories/allocation-view-url-state';

describe('allocation view url state', () => {
  test('parses valid fill date range', () => {
    const state = getAllocationViewUrlState(
      new URLSearchParams('filledFrom=2026-04-01&filledTo=2026-04-03'),
    );

    expect(state).toEqual({
      alphaMarketReturn: 0,
      alphaRiskFreeAnnual: 0.04,
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
      hideValues: false,
    });
  });

  test('ignores invalid dates', () => {
    const state = getAllocationViewUrlState(
      new URLSearchParams('filledFrom=bad-value&filledTo=2026-13-40'),
    );

    expect(state).toEqual({
      alphaMarketReturn: 0,
      alphaRiskFreeAnnual: 0.04,
      filledFrom: undefined,
      filledTo: undefined,
      hideValues: false,
    });
  });

  test('serializes state to expected query params', () => {
    const searchParams = getSearchParamsWithAllocationViewUrlState(
      new URLSearchParams('foo=bar'),
      {
        alphaMarketReturn: 0,
        alphaRiskFreeAnnual: 0.04,
        filledFrom: '2026-04-01',
        filledTo: '2026-04-03',
        hideValues: true,
      },
    );

    expect(searchParams.toString()).toBe(
      'foo=bar&filledFrom=2026-04-01&filledTo=2026-04-03&hideValues=1',
    );
  });

  test('parses valid alpha inputs', () => {
    const state = getAllocationViewUrlState(
      new URLSearchParams(
        'alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045',
      ),
    );

    expect(state.alphaMarketReturn).toBe(0.08);
    expect(state.alphaRiskFreeAnnual).toBe(0.045);
  });

  test('falls back to alpha defaults for invalid inputs', () => {
    const state = getAllocationViewUrlState(
      new URLSearchParams('alphaMarketReturn=bad&alphaRiskFreeAnnual=-1.5'),
    );

    expect(state.alphaMarketReturn).toBe(0);
    expect(state.alphaRiskFreeAnnual).toBe(0.04);
  });

  test('preserves alpha inputs when applying updates', () => {
    const searchParams = getSearchParamsWithUpdatedAllocationViewUrlState(
      new URLSearchParams('alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045'),
      {
        filledFrom: '2026-04-01',
      },
    );

    expect(searchParams.toString()).toBe(
      'alphaMarketReturn=0.08&alphaRiskFreeAnnual=0.045&filledFrom=2026-04-01',
    );
  });

  test('preserves unrelated params when applying updates', () => {
    const searchParams = getSearchParamsWithUpdatedAllocationViewUrlState(
      new URLSearchParams('foo=bar'),
      {
        filledFrom: '2026-04-01',
      },
    );

    expect(searchParams.toString()).toBe('foo=bar&filledFrom=2026-04-01');
  });

  test('clears dates when values are unset', () => {
    const searchParams = getSearchParamsWithUpdatedAllocationViewUrlState(
      new URLSearchParams('filledFrom=2026-04-01&filledTo=2026-04-03'),
      {
        filledFrom: undefined,
        filledTo: undefined,
      },
    );

    expect(searchParams.toString()).toBe('');
  });

  test('parses and clears hidden values mode', () => {
    expect(
      getAllocationViewUrlState(new URLSearchParams('hideValues=1')).hideValues,
    ).toBe(true);
    expect(
      getAllocationViewUrlState(new URLSearchParams('hideValues=true'))
        .hideValues,
    ).toBe(false);

    const searchParams = getSearchParamsWithUpdatedAllocationViewUrlState(
      new URLSearchParams('hideValues=1'),
      {
        hideValues: false,
      },
    );

    expect(searchParams.toString()).toBe('');
  });
});
