'use client';

import { PrivacyToggleButton } from '@/app/_components/PrivacyToggleButton';
import { Button } from '@/components/ui/button';
import {
  getCategoriesViewUrlState,
  getSearchParamsWithUpdatedCategoriesViewUrlState,
} from '@/lib/client/categories-view-url-state';
import type { CategoriesViewUrlState } from '@/lib/client/categories-view-url-state';
import { buildCategoryAllocationViewModel } from '@/lib/client/instrument-category-allocation';
import { useInstrumentCategoriesQuery } from '@/lib/client/useInstrumentCategoriesQuery';
import { useInstrumentCategoryMutations } from '@/lib/client/useInstrumentCategoryMutations';
import type { CategorizedInstrument } from '@portfolio/domain';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CategoriesManageView } from './CategoriesManageView';
import { PortfolioAllocationView } from './PortfolioAllocationView';

export function CategoriesManager() {
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
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const urlState = getCategoriesViewUrlState(searchParams);
  const hideValues = urlState.hideValues;
  const fillDateRangeFilter = {
    filledFrom: urlState.filledFrom,
    filledTo: urlState.filledTo,
  };
  const isMutating = setCategories.isPending || unsetCategories.isPending;
  const selectedCount = selectedIsins.size;
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

  useEffect(() => {
    if (!data) {
      return;
    }

    setDraftCategories((current) => {
      const next: Record<string, string> = {};

      data.instruments.forEach((instrument) => {
        next[instrument.isin] =
          current[instrument.isin] ?? instrument.category ?? '';
      });

      return next;
    });
  }, [data]);

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
        fillDateRangeFilter,
        historicalOrders: data?.historicalOrders ?? [],
        instruments: data?.instruments ?? [],
      }),
    [data, fillDateRangeFilter],
  );

  if (isLoading) {
    return <p>Loading categories...</p>;
  }

  if (error || !data) {
    return (
      <p>
        {error instanceof Error ? error.message : 'Failed to load categories.'}
      </p>
    );
  }

  const visibleSelectedCount = visibleInstruments.filter((instrument) =>
    selectedIsins.has(instrument.isin),
  ).length;
  const allSelected =
    visibleInstruments.length > 0 &&
    visibleSelectedCount === visibleInstruments.length;

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

  const saveRow = (instrument: CategorizedInstrument) => {
    const category = draftCategories[instrument.isin] ?? '';

    setCategories.mutate(
      { isins: [instrument.isin], category },
      {
        onSuccess: ({ category: savedCategory }) => {
          setDraftCategories((current) => ({
            ...current,
            [instrument.isin]: savedCategory,
          }));
        },
      },
    );
  };

  const unsetRow = (instrument: CategorizedInstrument) => {
    unsetCategories.mutate(
      { isins: [instrument.isin] },
      {
        onSuccess: () => {
          setDraftCategories((current) => ({
            ...current,
            [instrument.isin]: '',
          }));
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

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='font-mono text-2xl sm:text-3xl'>
            Instrument Categories
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <PrivacyToggleButton />
          <Button
            onClick={() => replaceUrlState({ mode: 'manage' })}
            type='button'
            variant={urlState.mode === 'manage' ? 'default' : 'outline'}
          >
            Manage categories
          </Button>
          <Button
            onClick={() => replaceUrlState({ mode: 'allocation' })}
            type='button'
            variant={urlState.mode === 'allocation' ? 'default' : 'outline'}
          >
            Portfolio allocation
          </Button>
        </div>
      </div>

      {urlState.mode === 'allocation' ? (
        <PortfolioAllocationView
          fillDateRangeFilter={fillDateRangeFilter}
          hideValues={hideValues}
          onFillDateRangeFilterChange={replaceUrlState}
          viewModel={allocationViewModel}
        />
      ) : (
        <CategoriesManageView
          allSelected={allSelected}
          bulkCategory={bulkCategory}
          canMutate={!isMutating}
          data={visibleInstruments}
          draftCategories={draftCategories}
          isMutating={isMutating}
          onBulkCategoryChange={setBulkCategory}
          onSaveBulkCategory={saveBulkCategory}
          onSaveRow={saveRow}
          onShowCurrentOnlyChange={(checked) => {
            setShowCurrentOnly(checked);
            setSelectedIsins(new Set());
          }}
          onShowUncategorizedOnlyChange={(checked) => {
            setShowUncategorizedOnly(checked);
            setSelectedIsins(new Set());
          }}
          onToggleAll={toggleAll}
          onToggleInstrument={toggleInstrument}
          onUnsetBulkCategory={unsetBulkCategory}
          onUnsetRow={unsetRow}
          selectedCount={selectedCount}
          selectedIsins={selectedIsins}
          setDraftCategories={setDraftCategories}
          showCurrentOnly={showCurrentOnly}
          showUncategorizedOnly={showUncategorizedOnly}
        />
      )}
    </div>
  );
}
