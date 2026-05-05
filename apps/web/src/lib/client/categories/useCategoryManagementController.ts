'use client';

import { EMPTY_APP_CAPABILITIES } from '@/lib/client/app-capabilities';
import type { CategorizedInstrument } from '@portfolio/domain';
import { useState } from 'react';
import { useCategoryManagementQuery } from './useCategoryManagementQuery';
import { useInstrumentCategoryMutations } from './useInstrumentCategoryMutations';

type CategoryManagementStatus =
  | { state: 'loading' }
  | { message: string; state: 'error' }
  | { state: 'ready' };

type CategoryManagementModel = {
  allSelected: boolean;
  bulkCategory: string;
  capabilities: ReturnType<typeof useCategoryManagementQuery>['data'] extends {
    capabilities: infer T;
  }
    ? T
    : typeof EMPTY_APP_CAPABILITIES;
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

function useCategoryManagementController() {
  const { data, error, isLoading } = useCategoryManagementQuery();
  const { setCategories, unsetCategories } = useInstrumentCategoryMutations();
  const [selectedIsins, setSelectedIsins] = useState<Set<string>>(new Set());
  const [draftCategories, setDraftCategories] = useState<
    Record<string, string>
  >({});
  const [bulkCategory, setBulkCategory] = useState('');
  const [showCurrentOnly, setShowCurrentOnlyState] = useState(false);
  const [showUncategorizedOnly, setShowUncategorizedOnlyState] =
    useState(false);

  const visibleInstruments =
    data?.instruments.filter(
      (instrument) =>
        (!showCurrentOnly || instrument.currentlyHeld) &&
        (!showUncategorizedOnly || !instrument.category),
    ) ?? [];
  const selectedIsinsList = Array.from(selectedIsins);
  const visibleSelectedCount = visibleInstruments.filter((instrument) =>
    selectedIsins.has(instrument.isin),
  ).length;
  const allSelected =
    visibleInstruments.length > 0 &&
    visibleSelectedCount === visibleInstruments.length;
  const isMutating = setCategories.isPending || unsetCategories.isPending;
  const status: CategoryManagementStatus = isLoading
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

  const toggleAll = () => {
    setSelectedIsins((current) => {
      const next = new Set(current);

      if (allSelected) {
        visibleInstruments.forEach((instrument) => next.delete(instrument.isin));
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
    actions: {
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
    model: {
      allSelected,
      bulkCategory,
      capabilities: data?.capabilities ?? EMPTY_APP_CAPABILITIES,
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

export { useCategoryManagementController };
export type {
  CategoryManagementActions,
  CategoryManagementModel,
  CategoryManagementStatus,
};
