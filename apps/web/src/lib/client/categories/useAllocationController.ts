'use client';

import { EMPTY_APP_CAPABILITIES } from '@/lib/client/app-capabilities';
import { buildCategoryAllocationViewModel } from '@/lib/client/categories/instrument-category-allocation';
import type { CategoryAllocationViewModel } from '@/lib/client/categories/instrument-category-allocation';
import type { FillDateRangeFilter } from '@/lib/client/portfolio/fill-date-filter';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  getAllocationViewUrlState,
  getSearchParamsWithUpdatedAllocationViewUrlState,
} from './allocation-view-url-state';
import type { AllocationViewUrlState } from './allocation-view-url-state';
import { useAllocationQuery } from './useAllocationQuery';

type AllocationStatus =
  | { state: 'loading' }
  | { message: string; state: 'error' }
  | { state: 'ready' };

type AllocationModel = {
  alphaMarketReturn: number;
  alphaRiskFreeAnnual: number;
  capabilities: ReturnType<typeof useAllocationQuery>['data'] extends {
    capabilities: infer T;
  }
    ? T
    : typeof EMPTY_APP_CAPABILITIES;
  fillDateRangeFilter: FillDateRangeFilter;
  hideValues: boolean;
  unresolvedCurrentHoldingsCount: number;
  viewModel: CategoryAllocationViewModel;
};

type AllocationActions = {
  openRiskMappings: () => void;
  setAlphaAssumptions: (value: {
    marketReturn?: number;
    riskFreeAnnual?: number;
  }) => void;
  setFillDateRangeFilter: (value: FillDateRangeFilter) => void;
};

function useAllocationController() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading } = useAllocationQuery();
  const urlState = getAllocationViewUrlState(searchParams);
  const fillDateRangeFilter = useMemo(
    () => ({
      filledFrom: urlState.filledFrom,
      filledTo: urlState.filledTo,
    }),
    [urlState.filledFrom, urlState.filledTo],
  );
  const allocationViewModel = useMemo(
    () =>
      buildCategoryAllocationViewModel({
        alphaAssumptions: {
          marketReturn: urlState.alphaMarketReturn,
          riskFreeAnnual: urlState.alphaRiskFreeAnnual,
        },
        fillDateRangeFilter,
        historicalOrders: data?.historicalOrders ?? [],
        instruments: data?.instruments ?? [],
      }),
    [
      data,
      fillDateRangeFilter,
      urlState.alphaMarketReturn,
      urlState.alphaRiskFreeAnnual,
    ],
  );
  const status: AllocationStatus = isLoading
    ? { state: 'loading' }
    : error || !data
      ? {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load allocation.',
          state: 'error',
        }
      : { state: 'ready' };

  const replaceUrlState = (partialState: Partial<AllocationViewUrlState>) => {
    const nextSearchParams = getSearchParamsWithUpdatedAllocationViewUrlState(
      searchParams,
      partialState,
    );
    const queryString = nextSearchParams.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  return {
    actions: {
      openRiskMappings: () => router.push('/risk-mappings'),
      setAlphaAssumptions: ({ marketReturn, riskFreeAnnual }) => {
        const nextState: Partial<AllocationViewUrlState> = {};

        if (marketReturn !== undefined) {
          nextState.alphaMarketReturn = marketReturn;
        }

        if (riskFreeAnnual !== undefined) {
          nextState.alphaRiskFreeAnnual = riskFreeAnnual;
        }

        replaceUrlState(nextState);
      },
      setFillDateRangeFilter: replaceUrlState,
    } satisfies AllocationActions,
    model: {
      alphaMarketReturn: urlState.alphaMarketReturn,
      alphaRiskFreeAnnual: urlState.alphaRiskFreeAnnual,
      capabilities: data?.capabilities ?? EMPTY_APP_CAPABILITIES,
      fillDateRangeFilter,
      hideValues: urlState.hideValues,
      unresolvedCurrentHoldingsCount:
        data?.riskMappingSummary.unresolvedCurrentHoldingsCount ?? 0,
      viewModel: allocationViewModel,
    } satisfies AllocationModel,
    status,
  };
}

export { useAllocationController };
export type {
  AllocationActions as CategoryAllocationPanelActions,
  AllocationModel as CategoryAllocationPanelModel,
  AllocationStatus,
};
