import { parseQueryDate } from './orders-view-url-state';

type CategoriesViewMode = 'manage' | 'allocation';

type CategoriesViewUrlState = {
  mode: CategoriesViewMode;
  filledFrom?: string;
  filledTo?: string;
};

const DEFAULT_CATEGORIES_VIEW_URL_STATE: CategoriesViewUrlState = {
  mode: 'manage',
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
