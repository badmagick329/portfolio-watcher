import { parseQueryDate } from '../orders/orders-view-url-state';
import { DEFAULT_ALPHA_ASSUMPTIONS } from './category-allocation-types';

type AllocationViewUrlState = {
  alphaMarketReturn: number;
  alphaRiskFreeAnnual: number;
  filledFrom?: string;
  filledTo?: string;
  hideValues: boolean;
};

const DEFAULT_ALLOCATION_VIEW_URL_STATE: AllocationViewUrlState = {
  alphaMarketReturn: DEFAULT_ALPHA_ASSUMPTIONS.marketReturn,
  alphaRiskFreeAnnual: DEFAULT_ALPHA_ASSUMPTIONS.riskFreeAnnual,
  hideValues: false,
};

const getAllocationViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null },
): AllocationViewUrlState => {
  const filledFrom = searchParams.get('filledFrom');
  const filledTo = searchParams.get('filledTo');
  const alphaMarketReturn = parseDecimal(
    searchParams.get('alphaMarketReturn'),
    DEFAULT_ALLOCATION_VIEW_URL_STATE.alphaMarketReturn,
  );
  const alphaRiskFreeAnnual = parseDecimal(
    searchParams.get('alphaRiskFreeAnnual'),
    DEFAULT_ALLOCATION_VIEW_URL_STATE.alphaRiskFreeAnnual,
    { minExclusive: -1 },
  );

  return {
    alphaMarketReturn,
    alphaRiskFreeAnnual,
    filledFrom: parseQueryDate(filledFrom)
      ? (filledFrom ?? undefined)
      : undefined,
    filledTo: parseQueryDate(filledTo) ? (filledTo ?? undefined) : undefined,
    hideValues: searchParams.get('hideValues') === '1',
  };
};

const getSearchParamsWithAllocationViewUrlState = (
  searchParams: URLSearchParams | { toString(): string },
  state: AllocationViewUrlState,
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

  setDecimalSearchParam({
    defaultValue: DEFAULT_ALLOCATION_VIEW_URL_STATE.alphaMarketReturn,
    name: 'alphaMarketReturn',
    searchParams: nextSearchParams,
    value: state.alphaMarketReturn,
  });
  setDecimalSearchParam({
    defaultValue: DEFAULT_ALLOCATION_VIEW_URL_STATE.alphaRiskFreeAnnual,
    name: 'alphaRiskFreeAnnual',
    searchParams: nextSearchParams,
    value: state.alphaRiskFreeAnnual,
  });

  return nextSearchParams;
};

const getSearchParamsWithUpdatedAllocationViewUrlState = (
  searchParams:
    | URLSearchParams
    | {
        get(name: string): string | null;
        toString(): string;
      },
  partialState: Partial<AllocationViewUrlState>,
) =>
  getSearchParamsWithAllocationViewUrlState(searchParams, {
    ...getAllocationViewUrlState(searchParams),
    ...partialState,
  });

const parseDecimal = (
  value: string | null,
  fallback: number,
  options: { minExclusive?: number } = {},
) => {
  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (options.minExclusive !== undefined && parsed <= options.minExclusive) {
    return fallback;
  }

  return parsed;
};

const setDecimalSearchParam = ({
  defaultValue,
  name,
  searchParams,
  value,
}: {
  defaultValue: number;
  name: string;
  searchParams: URLSearchParams;
  value: number;
}) => {
  if (!Number.isFinite(value) || value === defaultValue) {
    searchParams.delete(name);
    return;
  }

  searchParams.set(name, String(value));
};

export {
  DEFAULT_ALLOCATION_VIEW_URL_STATE,
  getAllocationViewUrlState,
  getSearchParamsWithAllocationViewUrlState,
  getSearchParamsWithUpdatedAllocationViewUrlState,
};
export type { AllocationViewUrlState };
