'use client';

import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
import { Button } from '@/components/ui/button';
import type {
  MoversPanelActions,
  MoversPanelModel,
} from '@/lib/client/movers/useMoversController';
import { MoversTable } from './MoversTable';

type MoversPanelProps = {
  actions: MoversPanelActions;
  model: MoversPanelModel;
};

function MoversPanel({ actions, model }: MoversPanelProps) {
  const hasSyncedPortfolioState = model.capabilities.lastPortfolioSyncAt !== null;

  if (!model.capabilities.hasBrokerCredentials) {
    return (
      <p className='text-sm text-muted-foreground'>
        Add Trading 212 API credentials to sync portfolio state.
      </p>
    );
  }

  if (!hasSyncedPortfolioState) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sync portfolio state to see movers.
      </p>
    );
  }

  if (!model.capabilities.hasCurrentHoldings) {
    return (
      <p className='text-sm text-muted-foreground'>
        No current holdings to compare.
      </p>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col gap-2'>
          <FillDateRangePicker
            onChange={actions.setFillDateRangeFilter}
            value={model.fillDateRangeFilter}
          />
          <p className='text-xs text-muted-foreground'>
            {getDateRangeLabel(model.dateRange)}
          </p>
        </div>

        <div className='inline-flex w-fit rounded-md border border-border p-1'>
          <Button
            onClick={() => actions.setSort('percent')}
            size='sm'
            type='button'
            variant={model.sort === 'percent' ? 'default' : 'ghost'}
          >
            % change
          </Button>
          <Button
            onClick={() => actions.setSort('impact')}
            size='sm'
            type='button'
            variant={model.sort === 'impact' ? 'default' : 'ghost'}
          >
            P/L impact
          </Button>
        </div>
      </div>

      {model.excludedCount > 0 ? (
        <p className='text-sm text-muted-foreground'>
          {model.excludedCount} current holding
          {model.excludedCount === 1 ? '' : 's'} excluded because stored price
          coverage is incomplete.
        </p>
      ) : null}

      {model.viewModel.gainers.totalRows === 0 &&
      model.viewModel.losers.totalRows === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No current holdings have comparable stored prices in this range.
        </p>
      ) : (
        <div className='flex flex-col gap-8'>
          <MoversTable
            hideValues={model.hideValues}
            onPageChange={actions.setGainersPage}
            title='Biggest gainers'
            viewModel={model.viewModel.gainers}
          />
          <MoversTable
            hideValues={model.hideValues}
            onPageChange={actions.setLosersPage}
            title='Biggest losers'
            viewModel={model.viewModel.losers}
          />
        </div>
      )}
    </div>
  );
}

const getDateRangeLabel = (dateRange: MoversPanelModel['dateRange']) => {
  if (!dateRange.startBoundary || !dateRange.endBoundary) {
    return 'No stored price range available.';
  }

  if (!dateRange.requestedFilledFrom && !dateRange.requestedFilledTo) {
    return `Latest 7 days: ${formatBoundaryDate(
      dateRange.startBoundary,
    )} to ${formatBoundaryDate(dateRange.endBoundary)}.`;
  }

  return `${formatBoundaryDate(dateRange.startBoundary)} to ${formatBoundaryDate(
    dateRange.endBoundary,
  )}.`;
};

const formatBoundaryDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export { MoversPanel };
