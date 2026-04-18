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
import { formatCategoryName } from '@/lib/client/categories/display-category';
import type {
  CategoryManagementActions,
  CategoryManagementModel,
} from '@/lib/client/categories/useInstrumentCategoriesController';

type CategoryManagementPanelProps = {
  actions: CategoryManagementActions;
  model: CategoryManagementModel;
};

function CategoryManagementPanel({
  actions,
  model,
}: CategoryManagementPanelProps) {
  return (
    <>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5'>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={model.showCurrentOnly}
            onChange={(event) =>
              actions.setShowCurrentOnly(event.target.checked)
            }
            type='checkbox'
          />
          Current holdings only
        </label>
        <label className='flex w-fit items-center gap-2 text-sm text-muted-foreground'>
          <input
            checked={model.showUncategorizedOnly}
            onChange={(event) =>
              actions.setShowUncategorizedOnly(event.target.checked)
            }
            type='checkbox'
          />
          Uncategorized only
        </label>
      </div>

      {model.selectedCount > 0 ? (
        <div className='flex flex-col gap-3 border border-border p-3 sm:flex-row sm:items-center'>
          <p className='text-sm text-muted-foreground'>
            {model.selectedCount} selected
          </p>
          <Input
            className='max-w-xs'
            disabled={model.isMutating}
            onChange={(event) => actions.setBulkCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && model.bulkCategory.trim()) {
                actions.saveBulkCategory();
              }
            }}
            placeholder='Category'
            value={model.bulkCategory}
          />
          <div className='flex gap-2'>
            <Button
              disabled={!model.bulkCategory.trim() || model.isMutating}
              onClick={actions.saveBulkCategory}
              type='button'
            >
              Set category
            </Button>
            <Button
              disabled={model.isMutating}
              onClick={actions.unsetBulkCategory}
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
                  checked={model.allSelected}
                  disabled={model.instruments.length === 0 || model.isMutating}
                  onChange={actions.toggleAll}
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
            {model.instruments.map((instrument) => {
              const draftCategory =
                model.draftCategories[instrument.isin] ??
                instrument.category ??
                '';
              const currentCategory = instrument.category ?? '';
              const normalizedDraft = draftCategory.trim().toLowerCase();
              const normalizedCurrent = currentCategory.trim().toLowerCase();
              const isSelected = model.selectedIsins.has(instrument.isin);
              const canSave =
                normalizedDraft.length > 0 &&
                normalizedDraft !== normalizedCurrent &&
                !model.isMutating;

              return (
                <TableRow
                  data-state={isSelected ? 'selected' : undefined}
                  key={instrument.isin}
                >
                  <TableCell>
                    <input
                      aria-label={`Select ${instrument.ticker}`}
                      checked={isSelected}
                      disabled={model.isMutating}
                      onChange={() => actions.toggleInstrument(instrument.isin)}
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
                          actions.saveRow(instrument);
                        }
                      }}
                    >
                      <Input
                        disabled={model.isMutating}
                        onChange={(event) =>
                          actions.setDraftCategory(
                            instrument.isin,
                            event.target.value,
                          )
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
                      disabled={!instrument.category || model.isMutating}
                      onClick={() => actions.unsetRow(instrument)}
                      type='button'
                      variant='outline'
                    >
                      Unset
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {model.instruments.length === 0 ? (
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

export { CategoryManagementPanel };
