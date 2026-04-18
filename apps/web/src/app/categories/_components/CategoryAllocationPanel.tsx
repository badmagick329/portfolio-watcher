'use client';

import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
import { CategoryAllocationCharts } from './CategoryAllocationCharts';
import { CategoryAllocationSummary } from './CategoryAllocationSummary';
import { CategoryAllocationTable } from './CategoryAllocationTable';
import type {
  CategoryAllocationPanelActions,
  CategoryAllocationPanelModel,
} from '@/lib/client/categories/useInstrumentCategoriesController';

type CategoryAllocationPanelProps = {
  actions: CategoryAllocationPanelActions;
  model: CategoryAllocationPanelModel;
};

function CategoryAllocationPanel({
  actions,
  model,
}: CategoryAllocationPanelProps) {
  const isHistorical = model.viewModel.mode === 'historical';
  const returnRows = isHistorical
    ? model.viewModel.rows.filter((row) => row.returnPercent !== null)
    : model.viewModel.rows;

  if (!model.viewModel.hasPositionSnapshots) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sync portfolio state to see allocation.
      </p>
    );
  }

  if (isHistorical && !model.viewModel.hasFilteredOrders) {
    return (
      <div className='flex flex-col gap-4'>
        <FillDateRangePicker
          onChange={actions.setFillDateRangeFilter}
          value={model.fillDateRangeFilter}
        />
        <p className='text-sm text-muted-foreground'>
          No filled orders in this date range.
        </p>
      </div>
    );
  }

  if (!model.viewModel.hasCurrentHoldings) {
    return (
      <div className='flex flex-col gap-4'>
        <FillDateRangePicker
          onChange={actions.setFillDateRangeFilter}
          value={model.fillDateRangeFilter}
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
        onChange={actions.setFillDateRangeFilter}
        value={model.fillDateRangeFilter}
      />

      <CategoryAllocationSummary
        hideValues={model.hideValues}
        isHistorical={isHistorical}
        viewModel={model.viewModel}
      />
      <CategoryAllocationCharts
        hideValues={model.hideValues}
        isHistorical={isHistorical}
        mode={model.viewModel.mode}
        returnRows={returnRows}
        rows={model.viewModel.rows}
        totalCurrentValue={model.viewModel.totalCurrentValue}
      />
      <CategoryAllocationTable
        hideValues={model.hideValues}
        isHistorical={isHistorical}
        rows={model.viewModel.rows}
      />
    </div>
  );
}

export { CategoryAllocationPanel };
