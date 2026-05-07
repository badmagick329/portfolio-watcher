import { describe, expect, test } from 'vitest';
import {
  getMoversViewUrlState,
  getSearchParamsWithUpdatedMoversViewUrlState,
} from '../../movers/movers-view-url-state';

describe('movers view url state', () => {
  test('parses valid state', () => {
    const state = getMoversViewUrlState(
      new URLSearchParams(
        'filledFrom=2026-04-01&filledTo=2026-04-03&hideValues=1&sort=impact&gainersPage=2&losersPage=3',
      ),
    );

    expect(state).toEqual({
      filledFrom: '2026-04-01',
      filledTo: '2026-04-03',
      hideValues: true,
      sort: 'impact',
      gainersPage: 2,
      losersPage: 3,
    });
  });

  test('falls back for invalid values', () => {
    const state = getMoversViewUrlState(
      new URLSearchParams(
        'filledFrom=bad&filledTo=2026-13-40&sort=value&gainersPage=0&losersPage=-1',
      ),
    );

    expect(state).toEqual({
      filledFrom: undefined,
      filledTo: undefined,
      hideValues: false,
      sort: 'percent',
      gainersPage: 1,
      losersPage: 1,
    });
  });

  test('resets pages when date or sort changes', () => {
    const byDate = getSearchParamsWithUpdatedMoversViewUrlState(
      new URLSearchParams('gainersPage=4&losersPage=5&sort=impact'),
      {
        filledFrom: '2026-04-01',
        gainersPage: 1,
        losersPage: 1,
      },
    );
    const bySort = getSearchParamsWithUpdatedMoversViewUrlState(
      new URLSearchParams('gainersPage=4&losersPage=5'),
      {
        sort: 'impact',
        gainersPage: 1,
        losersPage: 1,
      },
    );

    expect(byDate.toString()).toBe('sort=impact&filledFrom=2026-04-01');
    expect(bySort.toString()).toBe('sort=impact');
  });
});
