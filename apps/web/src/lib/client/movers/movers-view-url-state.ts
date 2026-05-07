import { parseQueryDate } from '../orders/orders-view-url-state';

type MoversSortMode = 'percent' | 'impact';

type MoversViewUrlState = {
  filledFrom?: string;
  filledTo?: string;
  hideValues: boolean;
  sort: MoversSortMode;
  gainersPage: number;
  losersPage: number;
};

const DEFAULT_MOVERS_VIEW_URL_STATE: MoversViewUrlState = {
  hideValues: false,
  sort: 'percent',
  gainersPage: 1,
  losersPage: 1,
};

const isMoversSortMode = (value: string | null): value is MoversSortMode =>
  value === 'percent' || value === 'impact';

const getPage = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getMoversViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null },
): MoversViewUrlState => {
  const filledFrom = searchParams.get('filledFrom');
  const filledTo = searchParams.get('filledTo');
  const sort = searchParams.get('sort');

  return {
    filledFrom: parseQueryDate(filledFrom) ? filledFrom ?? undefined : undefined,
    filledTo: parseQueryDate(filledTo) ? filledTo ?? undefined : undefined,
    hideValues: searchParams.get('hideValues') === '1',
    sort: isMoversSortMode(sort) ? sort : DEFAULT_MOVERS_VIEW_URL_STATE.sort,
    gainersPage: getPage(searchParams.get('gainersPage')),
    losersPage: getPage(searchParams.get('losersPage')),
  };
};

const getSearchParamsWithMoversViewUrlState = (
  searchParams: URLSearchParams | { toString(): string },
  state: MoversViewUrlState,
) => {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  if (state.filledFrom) {
    nextSearchParams.set('filledFrom', state.filledFrom);
  } else {
    nextSearchParams.delete('filledFrom');
  }

  if (state.filledTo) {
    nextSearchParams.set('filledTo', state.filledTo);
  } else {
    nextSearchParams.delete('filledTo');
  }

  if (state.hideValues) {
    nextSearchParams.set('hideValues', '1');
  } else {
    nextSearchParams.delete('hideValues');
  }

  if (state.sort !== DEFAULT_MOVERS_VIEW_URL_STATE.sort) {
    nextSearchParams.set('sort', state.sort);
  } else {
    nextSearchParams.delete('sort');
  }

  if (state.gainersPage > 1) {
    nextSearchParams.set('gainersPage', `${state.gainersPage}`);
  } else {
    nextSearchParams.delete('gainersPage');
  }

  if (state.losersPage > 1) {
    nextSearchParams.set('losersPage', `${state.losersPage}`);
  } else {
    nextSearchParams.delete('losersPage');
  }

  return nextSearchParams;
};

const getSearchParamsWithUpdatedMoversViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null; toString(): string },
  partialState: Partial<MoversViewUrlState>,
) =>
  getSearchParamsWithMoversViewUrlState(searchParams, {
    ...getMoversViewUrlState(searchParams),
    ...partialState,
  });

export {
  DEFAULT_MOVERS_VIEW_URL_STATE,
  getMoversViewUrlState,
  getSearchParamsWithMoversViewUrlState,
  getSearchParamsWithUpdatedMoversViewUrlState,
};
export type { MoversSortMode, MoversViewUrlState };
