'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInstrumentCategoryMutations } from '@/lib/client/useInstrumentCategoryMutations';
import { useInstrumentCategoriesQuery } from '@/lib/client/useInstrumentCategoriesQuery';
import type { CategorizedInstrument } from '@portfolio/domain';

export function CategoriesManager() {
  const { data, error, isLoading } = useInstrumentCategoriesQuery();
  const { setCategories, unsetCategories } = useInstrumentCategoryMutations();
  const [selectedIsins, setSelectedIsins] = useState<Set<string>>(new Set());
  const [draftCategories, setDraftCategories] = useState<Record<string, string>>(
    {},
  );
  const [bulkCategory, setBulkCategory] = useState('');
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const isMutating = setCategories.isPending || unsetCategories.isPending;
  const selectedCount = selectedIsins.size;

  useEffect(() => {
    if (!data) {
      return;
    }

    setDraftCategories((current) => {
      const next: Record<string, string> = {};

      data.forEach((instrument) => {
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
      data?.filter(
        (instrument) =>
          (!showCurrentOnly || instrument.currentlyHeld) &&
          (!showUncategorizedOnly || !instrument.category),
      ) ?? [],
    [data, showCurrentOnly, showUncategorizedOnly],
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
          <p className='text-sm text-muted-foreground'>
            Assign one category to each instrument.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='default'>
            Manage categories
          </Button>
          <Button disabled type='button' variant='outline'>
            Filter preview
          </Button>
        </div>
      </div>

      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5'>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={showCurrentOnly}
            onChange={(event) => {
              setShowCurrentOnly(event.target.checked);
              setSelectedIsins(new Set());
            }}
            type='checkbox'
          />
          Current holdings only
        </label>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={showUncategorizedOnly}
            onChange={(event) => {
              setShowUncategorizedOnly(event.target.checked);
              setSelectedIsins(new Set());
            }}
            type='checkbox'
          />
          Uncategorized only
        </label>
      </div>

      {selectedCount > 0 ? (
        <div className='flex flex-col gap-3 border border-border p-3 sm:flex-row sm:items-center'>
          <p className='text-sm text-muted-foreground'>
            {selectedCount} selected
          </p>
          <Input
            className='max-w-xs'
            disabled={isMutating}
            onChange={(event) => setBulkCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && bulkCategory.trim()) {
                saveBulkCategory();
              }
            }}
            placeholder='Category'
            value={bulkCategory}
          />
          <div className='flex gap-2'>
            <Button
              disabled={!bulkCategory.trim() || isMutating}
              onClick={saveBulkCategory}
              type='button'
            >
              Set category
            </Button>
            <Button
              disabled={isMutating}
              onClick={unsetBulkCategory}
              type='button'
              variant='outline'
            >
              Unset category
            </Button>
          </div>
        </div>
      ) : null}

      <div className='w-full overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  aria-label='Select all instruments'
                  checked={allSelected}
                  disabled={visibleInstruments.length === 0 || isMutating}
                  onChange={toggleAll}
                  type='checkbox'
                />
              </TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Current category</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleInstruments.map((instrument) => {
              const draftCategory = draftCategories[instrument.isin] ?? '';
              const currentCategory = instrument.category ?? '';
              const normalizedDraft = draftCategory.trim().toLowerCase();
              const normalizedCurrent = currentCategory.trim().toLowerCase();
              const isSelected = selectedIsins.has(instrument.isin);
              const canSave =
                normalizedDraft.length > 0 &&
                normalizedDraft !== normalizedCurrent &&
                !isMutating;

              return (
                <TableRow
                  data-state={isSelected ? 'selected' : undefined}
                  key={instrument.isin}
                >
                  <TableCell>
                    <input
                      aria-label={`Select ${instrument.ticker}`}
                      checked={isSelected}
                      disabled={isMutating}
                      onChange={() => toggleInstrument(instrument.isin)}
                      type='checkbox'
                    />
                  </TableCell>
                  <TableCell>{instrument.ticker}</TableCell>
                  <TableCell>{instrument.name}</TableCell>
                  <TableCell>{instrument.isin}</TableCell>
                  <TableCell>{instrument.category ?? '-'}</TableCell>
                  <TableCell>
                    <form
                      className='flex min-w-52 gap-2'
                      onSubmit={(event) => {
                        event.preventDefault();

                        if (canSave) {
                          saveRow(instrument);
                        }
                      }}
                    >
                      <Input
                        disabled={isMutating}
                        onChange={(event) =>
                          setDraftCategories((current) => ({
                            ...current,
                            [instrument.isin]: event.target.value,
                          }))
                        }
                        placeholder='Category'
                        value={draftCategory}
                      />
                      <Button disabled={!canSave} type='submit'>
                        Save
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Button
                      disabled={!instrument.category || isMutating}
                      onClick={() => unsetRow(instrument)}
                      type='button'
                      variant='outline'
                    >
                      Unset
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleInstruments.length === 0 ? (
              <TableRow>
                <TableCell className='text-muted-foreground' colSpan={7}>
                  No instruments match this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
