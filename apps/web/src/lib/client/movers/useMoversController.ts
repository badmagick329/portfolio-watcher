'use client';

import { EMPTY_APP_CAPABILITIES } from '@/lib/client/app-capabilities';
import type { FillDateRangeFilter } from '@/lib/client/portfolio/fill-date-filter';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { buildMoversViewModel } from './current-holding-movers';
import {
  getMoversViewUrlState,
  getSearchParamsWithUpdatedMoversViewUrlState,
} from './movers-view-url-state';
import type { MoversSortMode, MoversViewUrlState } from './movers-view-url-state';
import { useMoversQuery } from './useMoversQuery';

type MoversStatus =
  | { state: 'loading' }
  | { message: string; state: 'error' }
  | { state: 'ready' };

type MoversModel = {
  capabilities: ReturnType<typeof useMoversQuery>['data'] extends {
    capabilities: infer T;
  }
    ? T
    : typeof EMPTY_APP_CAPABILITIES;
  dateRange: ReturnType<typeof useMoversQuery>['data'] extends {
    movers: { dateRange: infer T };
  }
    ? T
    : {
        startBoundary: string | null;
        endBoundary: string | null;
        requestedFilledFrom: string | null;
        requestedFilledTo: string | null;
      };
  excludedCount: number;
  fillDateRangeFilter: FillDateRangeFilter;
  hideValues: boolean;
  sort: MoversSortMode;
  viewModel: ReturnType<typeof buildMoversViewModel>;
};

type MoversActions = {
  setFillDateRangeFilter: (value: FillDateRangeFilter) => void;
  setSort: (value: MoversSortMode) => void;
  setGainersPage: (page: number) => void;
  setLosersPage: (page: number) => void;
};

function useMoversController() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlState = getMoversViewUrlState(searchParams);
  const fillDateRangeFilter = useMemo(
    () => ({
      filledFrom: urlState.filledFrom,
      filledTo: urlState.filledTo,
    }),
    [urlState.filledFrom, urlState.filledTo],
  );
  const { data, error, isLoading } = useMoversQuery(fillDateRangeFilter);
  const viewModel = useMemo(
    () =>
      buildMoversViewModel({
        gainersPage: urlState.gainersPage,
        items: data?.movers.items ?? [],
        losersPage: urlState.losersPage,
        sort: urlState.sort,
      }),
    [data?.movers.items, urlState.gainersPage, urlState.losersPage, urlState.sort],
  );
  const status: MoversStatus = isLoading
    ? { state: 'loading' }
    : error || !data
      ? {
          message:
            error instanceof Error ? error.message : 'Failed to load movers.',
          state: 'error',
        }
      : { state: 'ready' };

  const replaceUrlState = (partialState: Partial<MoversViewUrlState>) => {
    const nextSearchParams = getSearchParamsWithUpdatedMoversViewUrlState(
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
      setFillDateRangeFilter: (value) =>
        replaceUrlState({
          ...value,
          gainersPage: 1,
          losersPage: 1,
        }),
      setGainersPage: (page) => replaceUrlState({ gainersPage: page }),
      setLosersPage: (page) => replaceUrlState({ losersPage: page }),
      setSort: (sort) =>
        replaceUrlState({
          sort,
          gainersPage: 1,
          losersPage: 1,
        }),
    } satisfies MoversActions,
    model: {
      capabilities: data?.capabilities ?? EMPTY_APP_CAPABILITIES,
      dateRange: data?.movers.dateRange ?? {
        startBoundary: null,
        endBoundary: null,
        requestedFilledFrom: null,
        requestedFilledTo: null,
      },
      excludedCount: data?.movers.excludedCount ?? 0,
      fillDateRangeFilter,
      hideValues: urlState.hideValues,
      sort: urlState.sort,
      viewModel,
    } satisfies MoversModel,
    status,
  };
}

export { useMoversController };
export type {
  MoversActions as MoversPanelActions,
  MoversModel as MoversPanelModel,
  MoversStatus,
};
