'use client';

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
import { formatCategoryName } from '@/lib/client/display-category';
import type { CategorizedInstrument } from '@portfolio/domain';
import type { Dispatch, SetStateAction } from 'react';

type CategoriesManageViewProps = {
  allSelected: boolean;
  bulkCategory: string;
  canMutate: boolean;
  data: CategorizedInstrument[];
  draftCategories: Record<string, string>;
  isMutating: boolean;
  onBulkCategoryChange: (value: string) => void;
  onSaveBulkCategory: () => void;
  onSaveRow: (instrument: CategorizedInstrument) => void;
  onShowCurrentOnlyChange: (checked: boolean) => void;
  onShowUncategorizedOnlyChange: (checked: boolean) => void;
  onToggleAll: () => void;
  onToggleInstrument: (isin: string) => void;
  onUnsetBulkCategory: () => void;
  onUnsetRow: (instrument: CategorizedInstrument) => void;
  selectedCount: number;
  selectedIsins: Set<string>;
  showCurrentOnly: boolean;
  showUncategorizedOnly: boolean;
  setDraftCategories: Dispatch<SetStateAction<Record<string, string>>>;
};

function CategoriesManageView({
  allSelected,
  bulkCategory,
  canMutate,
  data,
  draftCategories,
  isMutating,
  onBulkCategoryChange,
  onSaveBulkCategory,
  onSaveRow,
  onShowCurrentOnlyChange,
  onShowUncategorizedOnlyChange,
  onToggleAll,
  onToggleInstrument,
  onUnsetBulkCategory,
  onUnsetRow,
  selectedCount,
  selectedIsins,
  showCurrentOnly,
  showUncategorizedOnly,
  setDraftCategories,
}: CategoriesManageViewProps) {
  return (
    <>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5'>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={showCurrentOnly}
            onChange={(event) => onShowCurrentOnlyChange(event.target.checked)}
            type='checkbox'
          />
          Current holdings only
        </label>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={showUncategorizedOnly}
            onChange={(event) =>
              onShowUncategorizedOnlyChange(event.target.checked)
            }
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
            onChange={(event) => onBulkCategoryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && bulkCategory.trim()) {
                onSaveBulkCategory();
              }
            }}
            placeholder='Category'
            value={bulkCategory}
          />
          <div className='flex gap-2'>
            <Button
              disabled={!bulkCategory.trim() || isMutating}
              onClick={onSaveBulkCategory}
              type='button'
            >
              Set category
            </Button>
            <Button
              disabled={isMutating}
              onClick={onUnsetBulkCategory}
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
                  disabled={data.length === 0 || isMutating}
                  onChange={onToggleAll}
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
            {data.map((instrument) => {
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
                      onChange={() => onToggleInstrument(instrument.isin)}
                      type='checkbox'
                    />
                  </TableCell>
                  <TableCell>{instrument.ticker}</TableCell>
                  <TableCell>{instrument.name}</TableCell>
                  <TableCell>{instrument.isin}</TableCell>
                  <TableCell>
                    {formatCategoryName(instrument.category)}
                  </TableCell>
                  <TableCell>
                    <form
                      className='flex min-w-52 gap-2'
                      onSubmit={(event) => {
                        event.preventDefault();

                        if (canSave) {
                          onSaveRow(instrument);
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
                      onClick={() => onUnsetRow(instrument)}
                      type='button'
                      variant='outline'
                    >
                      Unset
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 ? (
              <TableRow>
                <TableCell className='text-muted-foreground' colSpan={7}>
                  No instruments match this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export { CategoriesManageView };
