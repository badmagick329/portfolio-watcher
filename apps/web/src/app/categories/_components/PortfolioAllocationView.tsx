'use client';

import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
import type { FillDateRangeFilter } from '@/lib/client/fill-date-filter';
import type { CategoryAllocationViewModel } from '@/lib/client/instrument-category-allocation';
import { CategoryAllocationCharts } from './CategoryAllocationCharts';
import { CategoryAllocationSummary } from './CategoryAllocationSummary';
import { CategoryAllocationTable } from './CategoryAllocationTable';

function PortfolioAllocationView({
  fillDateRangeFilter,
  hideValues,
  onFillDateRangeFilterChange,
  viewModel,
}: {
  fillDateRangeFilter: FillDateRangeFilter;
  hideValues: boolean;
  onFillDateRangeFilterChange: (value: FillDateRangeFilter) => void;
  viewModel: CategoryAllocationViewModel;
}) {
  const isHistorical = viewModel.mode === 'historical';
  const returnRows = isHistorical
    ? viewModel.rows.filter((row) => row.returnPercent !== null)
    : viewModel.rows;

  if (!viewModel.hasPositionSnapshots) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sync portfolio state to see allocation.
      </p>
    );
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
        <p className='text-sm text-muted-foreground'>
          No current holdings to chart.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      <FillDateRangePicker
        onChange={onFillDateRangeFilterChange}
        value={fillDateRangeFilter}
      />

      <CategoryAllocationSummary
        hideValues={hideValues}
        isHistorical={isHistorical}
        viewModel={viewModel}
      />
      <CategoryAllocationCharts
        hideValues={hideValues}
        isHistorical={isHistorical}
        mode={viewModel.mode}
        returnRows={returnRows}
        rows={viewModel.rows}
        totalCurrentValue={viewModel.totalCurrentValue}
      />
      <CategoryAllocationTable
        hideValues={hideValues}
        isHistorical={isHistorical}
        rows={viewModel.rows}
      />
    </div>
  );
}

export { PortfolioAllocationView };
