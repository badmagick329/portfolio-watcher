import { parseQueryDate } from '../orders/orders-view-url-state';

type CategoriesViewMode = 'manage' | 'allocation';

type CategoriesViewUrlState = {
  mode: CategoriesViewMode;
  filledFrom?: string;
  filledTo?: string;
  hideValues: boolean;
};

const DEFAULT_CATEGORIES_VIEW_URL_STATE: CategoriesViewUrlState = {
  mode: 'manage',
  hideValues: false,
};

const isCategoriesViewMode = (
  value: string | null,
): value is CategoriesViewMode =>
  value === 'manage' || value === 'allocation';

const getCategoriesViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null },
): CategoriesViewUrlState => {
  const mode = searchParams.get('mode');
  const filledFrom = searchParams.get('filledFrom');
  const filledTo = searchParams.get('filledTo');

  return {
    mode: isCategoriesViewMode(mode)
      ? mode
      : DEFAULT_CATEGORIES_VIEW_URL_STATE.mode,
    filledFrom: parseQueryDate(filledFrom) ? filledFrom ?? undefined : undefined,
    filledTo: parseQueryDate(filledTo) ? filledTo ?? undefined : undefined,
    hideValues: searchParams.get('hideValues') === '1',
  };
};

const getSearchParamsWithCategoriesViewUrlState = (
  searchParams: URLSearchParams | { toString(): string },
  state: CategoriesViewUrlState,
) => {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  nextSearchParams.set('mode', state.mode);

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

  return nextSearchParams;
};

const getSearchParamsWithUpdatedCategoriesViewUrlState = (
  searchParams: URLSearchParams | {
    get(name: string): string | null;
    toString(): string;
  },
  partialState: Partial<CategoriesViewUrlState>,
) =>
  getSearchParamsWithCategoriesViewUrlState(searchParams, {
    ...getCategoriesViewUrlState(searchParams),
    ...partialState,
  });

export {
  DEFAULT_CATEGORIES_VIEW_URL_STATE,
  getCategoriesViewUrlState,
  getSearchParamsWithCategoriesViewUrlState,
  getSearchParamsWithUpdatedCategoriesViewUrlState,
};
export type { CategoriesViewMode, CategoriesViewUrlState };
