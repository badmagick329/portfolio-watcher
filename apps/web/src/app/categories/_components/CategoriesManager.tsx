'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
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
import {
  getCategoriesViewUrlState,
  getSearchParamsWithUpdatedCategoriesViewUrlState,
} from '@/lib/client/categories-view-url-state';
import type { CategoriesViewUrlState } from '@/lib/client/categories-view-url-state';
import { formatCategoryName } from '@/lib/client/display-category';
import { buildCategoryAllocationViewModel } from '@/lib/client/instrument-category-allocation';
import type { CategoryAllocationRow } from '@/lib/client/instrument-category-allocation';
import type { FillDateRangeFilter } from '@/lib/client/fill-date-filter';
import { useInstrumentCategoryMutations } from '@/lib/client/useInstrumentCategoryMutations';
import { useInstrumentCategoriesQuery } from '@/lib/client/useInstrumentCategoriesQuery';
import type { CategorizedInstrument } from '@portfolio/domain';

const CHART_COLORS = [
  '#2f855a',
  '#c2410c',
  '#2563eb',
  '#ca8a04',
  '#0f766e',
  '#be123c',
  '#4b5563',
  '#7c2d12',
];
const NET_INVESTED_ADDITION_COLOR = '#2563eb';
const NET_INVESTED_WITHDRAWAL_COLOR = '#a855f7';

export function CategoriesManager() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading } = useInstrumentCategoriesQuery();
  const { setCategories, unsetCategories } = useInstrumentCategoryMutations();
  const [selectedIsins, setSelectedIsins] = useState<Set<string>>(new Set());
  const [draftCategories, setDraftCategories] = useState<Record<string, string>>(
    {},
  );
  const [bulkCategory, setBulkCategory] = useState('');
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const urlState = getCategoriesViewUrlState(searchParams);
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
          showCurrentOnly={showCurrentOnly}
          showUncategorizedOnly={showUncategorizedOnly}
          setDraftCategories={setDraftCategories}
        />
      )}
    </div>
  );
}

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
                  <TableCell>{formatCategoryName(instrument.category)}</TableCell>
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

function PortfolioAllocationView({
  fillDateRangeFilter,
  onFillDateRangeFilterChange,
  viewModel,
}: {
  fillDateRangeFilter: FillDateRangeFilter;
  onFillDateRangeFilterChange: (value: FillDateRangeFilter) => void;
  viewModel: ReturnType<typeof buildCategoryAllocationViewModel>;
}) {
  const isHistorical = viewModel.mode === 'historical';
  const returnRows = isHistorical
    ? viewModel.rows.filter((row) => row.returnPercent !== null)
    : viewModel.rows;

  if (!viewModel.hasPositionSnapshots) {
    return <p className='text-sm text-muted-foreground'>Sync portfolio state to see allocation.</p>;
  }

  if (isHistorical && !viewModel.hasFilteredOrders) {
    return (
      <div className='flex flex-col gap-4'>
        <FillDateRangePicker
          onChange={onFillDateRangeFilterChange}
          value={fillDateRangeFilter}
        />
        <p className='text-sm text-muted-foreground'>
          No filled orders in this date range.
        </p>
      </div>
    );
  }

  if (!viewModel.hasCurrentHoldings) {
    return (
      <div className='flex flex-col gap-4'>
        <FillDateRangePicker
          onChange={onFillDateRangeFilterChange}
          value={fillDateRangeFilter}
        />
        <p className='text-sm text-muted-foreground'>No current holdings to chart.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      <FillDateRangePicker
        onChange={onFillDateRangeFilterChange}
        value={fillDateRangeFilter}
      />

      <div className='grid gap-4 sm:grid-cols-3'>
        <PortfolioSummaryMetric
          label={isHistorical ? 'Net invested' : 'Value'}
          value={formatMoney(viewModel.totalCurrentValue)}
        />
        <PortfolioSummaryMetric
          label={isHistorical ? 'P/L' : 'Unrealized P/L'}
          tone={getNumberTone(viewModel.totalPnl)}
          value={
            viewModel.totalPnl === null ? 'n/a' : formatMoney(viewModel.totalPnl)
          }
        />
        <PortfolioSummaryMetric
          label='Return'
          tone={getNumberTone(viewModel.totalReturnPercent)}
          value={
            viewModel.totalReturnPercent === null
              ? 'n/a'
              : formatPercent(viewModel.totalReturnPercent)
          }
        />
      </div>

      <div className='grid gap-8 xl:grid-cols-2'>
        <section className='flex min-h-96 flex-col gap-3'>
          <div>
            <h2 className='font-mono text-lg'>
              {isHistorical
                ? 'Net invested by category'
                : 'Allocation by category'}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {isHistorical
                ? 'Buys minus sells in the selected range.'
                : 'Current value share.'}
            </p>
          </div>
          {isHistorical ? (
            <ResponsiveContainer height={320} width='100%'>
              <BarChart
                data={viewModel.rows}
                layout='vertical'
                margin={{ bottom: 8, left: 24, right: 120, top: 8 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray='3 3' />
                <XAxis
                  tickFormatter={(value) => formatMoney(Number(value))}
                  type='number'
                />
                <YAxis
                  dataKey='category'
                  tickFormatter={(value) => formatCategoryName(String(value))}
                  type='category'
                  width={110}
                />
                <Tooltip content={<NetInvestedTooltip />} />
                <ReferenceLine stroke='currentColor' x={0} />
                <Bar dataKey='netInvested'>
                  {viewModel.rows.map((row) => (
                    <Cell
                      fill={
                        (row.netInvested ?? 0) < 0
                          ? NET_INVESTED_WITHDRAWAL_COLOR
                          : NET_INVESTED_ADDITION_COLOR
                      }
                      key={row.category}
                    />
                  ))}
                  <LabelList
                    content={(props) =>
                      renderNetInvestedLabel({
                        ...props,
                        totalNetInvested: viewModel.totalCurrentValue,
                      })
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer height={320} width='100%'>
              <PieChart>
                <Pie
                  data={viewModel.rows}
                  dataKey='currentValue'
                  innerRadius={58}
                  nameKey='category'
                  outerRadius={110}
                  paddingAngle={2}
                  label={renderAllocationLabel}
                  labelLine={false}
                >
                  {viewModel.rows.map((row, index) => (
                    <Cell
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      key={row.category}
                    />
                  ))}
                </Pie>
                <Tooltip content={<AllocationTooltip />} />
                <Legend formatter={(value) => formatCategoryName(String(value))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className='flex min-h-96 flex-col gap-3'>
          <div>
            <h2 className='font-mono text-lg'>
              {isHistorical
                ? 'Return by category'
                : 'Unrealized return by category'}
            </h2>
            <p className='text-sm text-muted-foreground'>
              Positive and negative returns stay visible.
            </p>
          </div>
          {returnRows.length > 0 ? (
            <ResponsiveContainer height={320} width='100%'>
              <BarChart
                data={returnRows}
                layout='vertical'
                margin={{ bottom: 8, left: 24, right: 24, top: 8 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray='3 3' />
                <XAxis
                  tickFormatter={(value) => formatPercent(Number(value))}
                  type='number'
                />
                <YAxis
                  dataKey='category'
                  tickFormatter={(value) => formatCategoryName(String(value))}
                  type='category'
                  width={110}
                />
                <Tooltip content={<ReturnTooltip mode={viewModel.mode} />} />
                <ReferenceLine stroke='currentColor' x={0} />
                <Bar dataKey={(row: CategoryAllocationRow) => row.returnPercent ?? 0}>
                  {returnRows.map((row) => (
                    <Cell
                      fill={(row.returnPercent ?? 0) < 0 ? '#dc2626' : '#16a34a'}
                      key={row.category}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className='text-sm text-muted-foreground'>
              No in-range buys to calculate returns.
            </p>
          )}
        </section>
      </div>

      <Table>
        <TableHeader>
          {isHistorical ? (
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Instruments</TableHead>
              <TableHead>Buys</TableHead>
              <TableHead>Sells</TableHead>
              <TableHead>Net invested</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead>Return</TableHead>
            </TableRow>
          ) : (
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Holdings</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Unrealized P/L</TableHead>
              <TableHead>Return</TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {viewModel.rows.map((row) => (
            <TableRow key={row.category}>
              {isHistorical ? (
                <>
                  <TableCell>{formatCategoryName(row.category)}</TableCell>
                  <TableCell>{row.holdingCount}</TableCell>
                  <TableCell>{formatMoney(row.buyCost ?? 0)}</TableCell>
                  <TableCell>{formatMoney(row.sellProceeds ?? 0)}</TableCell>
                  <TableCell
                    className={
                      (row.netInvested ?? 0) < 0
                        ? 'text-red-600'
                        : 'text-green-700'
                    }
                  >
                    {formatMoney(row.netInvested ?? 0)}
                  </TableCell>
                  <TableCell
                    className={
                      row.unrealizedPnl !== null && row.unrealizedPnl < 0
                        ? 'text-red-600'
                        : 'text-green-700'
                    }
                  >
                    {row.unrealizedPnl === null
                      ? 'n/a'
                      : formatMoney(row.unrealizedPnl)}
                  </TableCell>
                  <TableCell
                    className={
                      row.returnPercent !== null && row.returnPercent < 0
                        ? 'text-red-600'
                        : 'text-green-700'
                    }
                  >
                    {row.returnPercent === null
                      ? 'n/a'
                      : formatPercent(row.returnPercent)}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>{formatCategoryName(row.category)}</TableCell>
                  <TableCell>{row.holdingCount}</TableCell>
                  <TableCell>{formatMoney(row.currentValue)}</TableCell>
                  <TableCell>{formatPercent(row.allocationPercent)}</TableCell>
                  <TableCell
                    className={
                      row.unrealizedPnl !== null && row.unrealizedPnl < 0
                        ? 'text-red-600'
                        : 'text-green-700'
                    }
                  >
                    {row.unrealizedPnl === null
                      ? 'n/a'
                      : formatMoney(row.unrealizedPnl)}
                  </TableCell>
                  <TableCell
                    className={
                      row.returnPercent !== null && row.returnPercent < 0
                        ? 'text-red-600'
                        : 'text-green-700'
                    }
                  >
                    {row.returnPercent === null
                      ? 'n/a'
                      : formatPercent(row.returnPercent)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PortfolioSummaryMetric({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'negative' | 'neutral' | 'positive';
  value: string;
}) {
  return (
    <div className='space-y-1'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p
        className={`font-mono text-2xl ${
          tone === 'negative'
            ? 'text-red-600'
            : tone === 'positive'
              ? 'text-green-700'
              : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AllocationTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>
        Value: {formatMoney(row.currentValue)}
      </p>
      <p>Share: {formatPercent(row.allocationPercent)}</p>
      <p>Holdings: {row.holdingCount}</p>
    </div>
  );
}

function NetInvestedTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>Buys: {formatMoney(row.buyCost ?? 0)}</p>
      <p>Sells: {formatMoney(row.sellProceeds ?? 0)}</p>
      <p>Net invested: {formatMoney(row.netInvested ?? 0)}</p>
      <p>Instruments: {row.holdingCount}</p>
    </div>
  );
}

function ReturnTooltip({ active, mode, payload }: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>
        Return:{' '}
        {row.returnPercent === null ? 'n/a' : formatPercent(row.returnPercent)}
      </p>
      <p>
        {mode === 'historical' ? 'P/L' : 'Unrealized P/L'}:{' '}
        {row.unrealizedPnl === null ? 'n/a' : formatMoney(row.unrealizedPnl)}
      </p>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  mode?: 'current' | 'historical';
  payload?: Array<{ payload: unknown }>;
};

type PieLabelProps = {
  cx?: number | string;
  cy?: number | string;
  midAngle?: number | string;
  outerRadius?: number | string;
  payload?: CategoryAllocationRow;
};

type NetInvestedLabelProps = {
  height?: number | string;
  payload?: CategoryAllocationRow;
  totalNetInvested: number;
  value?: unknown;
  width?: number | string;
  x?: number | string;
  y?: number | string;
};

function renderNetInvestedLabel({
  height,
  payload,
  totalNetInvested,
  value,
  width,
  x,
  y,
}: NetInvestedLabelProps) {
  const netInvested = Number(payload?.netInvested ?? value ?? 0);

  if (netInvested === 0) {
    return null;
  }

  const barX = Number(x ?? 0);
  const barY = Number(y ?? 0);
  const barWidth = Number(width ?? 0);
  const barHeight = Number(height ?? 0);
  const isWithdrawal = netInvested < 0;
  const labelX = isWithdrawal ? barX - 8 : barX + barWidth + 8;
  const labelY = barY + barHeight / 2;
  const share =
    totalNetInvested === 0 ? 'n/a' : formatPercent(netInvested / totalNetInvested);
  const label = `${formatMoney(netInvested)} (${share})`;
  const backgroundWidth = label.length * 7.4 + 12;
  const backgroundHeight = 20;
  const backgroundX = isWithdrawal
    ? labelX - backgroundWidth - 6
    : labelX - 6;
  const backgroundY = labelY - backgroundHeight / 2;

  return (
    <g>
      <rect
        fill='#050505'
        height={backgroundHeight}
        opacity={0.92}
        rx={4}
        width={backgroundWidth}
        x={backgroundX}
        y={backgroundY}
      />
      <text
        dominantBaseline='central'
        fill='#f9fafb'
        fontSize={12}
        textAnchor={isWithdrawal ? 'end' : 'start'}
        x={labelX}
        y={labelY}
      >
        {label}
      </text>
    </g>
  );
}

function renderAllocationLabel(props: PieLabelProps) {
  const percent = props.payload?.allocationPercent ?? 0;

  if (percent < 0.02) {
    return null;
  }

  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const radius = outerRadius + 26;
  const radians = (-midAngle * Math.PI) / 180;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text
      dominantBaseline='central'
      fill='currentColor'
      fontSize={12}
      textAnchor={x > cx ? 'start' : 'end'}
      x={x}
      y={y}
    >
      {formatCategoryName(props.payload?.category)} {formatPercent(percent)}
    </text>
  );
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    currency: 'GBP',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value);

const getNumberTone = (value: number | null) =>
  value === null ? 'neutral' : value < 0 ? 'negative' : 'positive';
