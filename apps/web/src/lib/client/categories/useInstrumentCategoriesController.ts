'use client';

import type { CategorizedInstrument } from '@portfolio/domain';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  getCategoriesViewUrlState,
  getSearchParamsWithUpdatedCategoriesViewUrlState,
} from '@/lib/client/categories/categories-view-url-state';
import type { CategoriesViewUrlState } from '@/lib/client/categories/categories-view-url-state';
import { buildCategoryAllocationViewModel } from '@/lib/client/categories/instrument-category-allocation';
import type { CategoryAllocationViewModel } from '@/lib/client/categories/instrument-category-allocation';
import { useInstrumentCategoriesQuery } from '@/lib/client/categories/useInstrumentCategoriesQuery';
import { useInstrumentCategoryMutations } from '@/lib/client/categories/useInstrumentCategoryMutations';
import type { FillDateRangeFilter } from '@/lib/client/portfolio/fill-date-filter';

type InstrumentCategoriesStatus =
  | { state: 'loading' }
  | { message: string; state: 'error' }
  | { state: 'ready' };

type InstrumentCategoriesHeaderModel = {
  mode: CategoriesViewUrlState['mode'];
};

type InstrumentCategoriesHeaderActions = {
  setMode: (mode: CategoriesViewUrlState['mode']) => void;
};

type CategoryManagementModel = {
  allSelected: boolean;
  bulkCategory: string;
  draftCategories: Record<string, string>;
  instruments: CategorizedInstrument[];
  isMutating: boolean;
  selectedCount: number;
  selectedIsins: Set<string>;
  showCurrentOnly: boolean;
  showUncategorizedOnly: boolean;
};

type CategoryManagementActions = {
  saveBulkCategory: () => void;
  saveRow: (instrument: CategorizedInstrument) => void;
  setBulkCategory: (value: string) => void;
  setDraftCategory: (isin: string, value: string) => void;
  setShowCurrentOnly: (checked: boolean) => void;
  setShowUncategorizedOnly: (checked: boolean) => void;
  toggleAll: () => void;
  toggleInstrument: (isin: string) => void;
  unsetBulkCategory: () => void;
  unsetRow: (instrument: CategorizedInstrument) => void;
};

type CategoryAllocationPanelModel = {
  alphaMarketReturn: number;
  alphaRiskFreeAnnual: number;
  fillDateRangeFilter: FillDateRangeFilter;
  hideValues: boolean;
  viewModel: CategoryAllocationViewModel;
};

type CategoryAllocationPanelActions = {
  setAlphaAssumptions: (value: {
    marketReturn?: number;
    riskFreeAnnual?: number;
  }) => void;
  setFillDateRangeFilter: (value: FillDateRangeFilter) => void;
};

function useInstrumentCategoriesController() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading } = useInstrumentCategoriesQuery();
  const { setCategories, unsetCategories } = useInstrumentCategoryMutations();
  const [selectedIsins, setSelectedIsins] = useState<Set<string>>(new Set());
  const [draftCategories, setDraftCategories] = useState<
    Record<string, string>
  >({});
  const [bulkCategory, setBulkCategory] = useState('');
  const [showCurrentOnly, setShowCurrentOnlyState] = useState(false);
  const [showUncategorizedOnly, setShowUncategorizedOnlyState] =
    useState(false);
  const urlState = getCategoriesViewUrlState(searchParams);
  const fillDateRangeFilter = useMemo(
    () => ({
      filledFrom: urlState.filledFrom,
      filledTo: urlState.filledTo,
    }),
    [urlState.filledFrom, urlState.filledTo],
  );
  const isMutating = setCategories.isPending || unsetCategories.isPending;
  const selectedIsinsList = useMemo(
    () => Array.from(selectedIsins),
    [selectedIsins],
  );
  const visibleInstruments = useMemo(
    () =>
      data?.instruments.filter(
        (instrument) =>
          (!showCurrentOnly || instrument.currentlyHeld) &&
          (!showUncategorizedOnly || !instrument.category),
      ) ?? [],
    [data, showCurrentOnly, showUncategorizedOnly],
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
  const visibleSelectedCount = visibleInstruments.filter((instrument) =>
    selectedIsins.has(instrument.isin),
  ).length;
  const allSelected =
    visibleInstruments.length > 0 &&
    visibleSelectedCount === visibleInstruments.length;
  const status: InstrumentCategoriesStatus = isLoading
    ? { state: 'loading' }
    : error || !data
      ? {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load categories.',
          state: 'error',
        }
      : { state: 'ready' };

  const replaceUrlState = (partialState: Partial<CategoriesViewUrlState>) => {
    const nextSearchParams = getSearchParamsWithUpdatedCategoriesViewUrlState(
      searchParams,
      partialState,
    );
    const queryString = nextSearchParams.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const toggleAll = () => {
    setSelectedIsins((current) => {
      const next = new Set(current);

      if (allSelected) {
        visibleInstruments.forEach((instrument) =>
          next.delete(instrument.isin),
        );
        return next;
      }

      visibleInstruments.forEach((instrument) => next.add(instrument.isin));
      return next;
    });
  };

  const toggleInstrument = (isin: string) => {
    setSelectedIsins((current) => {
      const next = new Set(current);

      if (next.has(isin)) {
        next.delete(isin);
      } else {
        next.add(isin);
      }

      return next;
    });
  };

  const setDraftCategory = (isin: string, value: string) => {
    setDraftCategories((current) => ({
      ...current,
      [isin]: value,
    }));
  };

  const setShowCurrentOnly = (checked: boolean) => {
    setShowCurrentOnlyState(checked);
    setSelectedIsins(new Set());
  };

  const setShowUncategorizedOnly = (checked: boolean) => {
    setShowUncategorizedOnlyState(checked);
    setSelectedIsins(new Set());
  };

  const saveRow = (instrument: CategorizedInstrument) => {
    const category = draftCategories[instrument.isin] ?? '';

    setCategories.mutate(
      { isins: [instrument.isin], category },
      {
        onSuccess: ({ category: savedCategory }) => {
          setDraftCategory(instrument.isin, savedCategory);
        },
      },
    );
  };

  const unsetRow = (instrument: CategorizedInstrument) => {
    unsetCategories.mutate(
      { isins: [instrument.isin] },
      {
        onSuccess: () => {
          setDraftCategory(instrument.isin, '');
        },
      },
    );
  };

  const saveBulkCategory = () => {
    setCategories.mutate(
      { isins: selectedIsinsList, category: bulkCategory },
      {
        onSuccess: ({ category }) => {
          setDraftCategories((current) => {
            const next = { ...current };

            selectedIsinsList.forEach((isin) => {
              next[isin] = category;
            });

            return next;
          });
          setBulkCategory('');
          setSelectedIsins(new Set());
        },
      },
    );
  };

  const unsetBulkCategory = () => {
    unsetCategories.mutate(
      { isins: selectedIsinsList },
      {
        onSuccess: () => {
          setDraftCategories((current) => {
            const next = { ...current };

            selectedIsinsList.forEach((isin) => {
              next[isin] = '';
            });

            return next;
          });
          setBulkCategory('');
          setSelectedIsins(new Set());
        },
      },
    );
  };

  return {
    allocationActions: {
      setAlphaAssumptions: ({ marketReturn, riskFreeAnnual }) => {
        const nextState: Partial<CategoriesViewUrlState> = {};

        if (marketReturn !== undefined) {
          nextState.alphaMarketReturn = marketReturn;
        }

        if (riskFreeAnnual !== undefined) {
          nextState.alphaRiskFreeAnnual = riskFreeAnnual;
        }

        replaceUrlState(nextState);
      },
      setFillDateRangeFilter: replaceUrlState,
    } satisfies CategoryAllocationPanelActions,
    allocationModel: {
      alphaMarketReturn: urlState.alphaMarketReturn,
      alphaRiskFreeAnnual: urlState.alphaRiskFreeAnnual,
      fillDateRangeFilter,
      hideValues: urlState.hideValues,
      viewModel: allocationViewModel,
    } satisfies CategoryAllocationPanelModel,
    headerActions: {
      setMode: (mode) => replaceUrlState({ mode }),
    } satisfies InstrumentCategoriesHeaderActions,
    headerModel: {
      mode: urlState.mode,
    } satisfies InstrumentCategoriesHeaderModel,
    managementActions: {
      saveBulkCategory,
      saveRow,
      setBulkCategory,
      setDraftCategory,
      setShowCurrentOnly,
      setShowUncategorizedOnly,
      toggleAll,
      toggleInstrument,
      unsetBulkCategory,
      unsetRow,
    } satisfies CategoryManagementActions,
    managementModel: {
      allSelected,
      bulkCategory,
      draftCategories,
      instruments: visibleInstruments,
      isMutating,
      selectedCount: selectedIsins.size,
      selectedIsins,
      showCurrentOnly,
      showUncategorizedOnly,
    } satisfies CategoryManagementModel,
    status,
  };
}

export { useInstrumentCategoriesController };
export type {
  CategoryAllocationPanelActions,
  CategoryAllocationPanelModel,
  CategoryManagementActions,
  CategoryManagementModel,
  InstrumentCategoriesHeaderActions,
  InstrumentCategoriesHeaderModel,
  InstrumentCategoriesStatus,
};
