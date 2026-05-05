'use client';

import { useState } from 'react';
import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
import { Button } from '@/components/ui/button';
import type {
  CategoryAllocationPanelActions,
  CategoryAllocationPanelModel,
} from '@/lib/client/categories/useAllocationController';
import { CategoryAllocationCharts } from './CategoryAllocationCharts';
import { CategoryAllocationSummary } from './CategoryAllocationSummary';
import { CategoryAllocationTable } from './CategoryAllocationTable';
import { CategoryAlphaAssumptions } from './CategoryAlphaAssumptions';

type CategoryAllocationPanelProps = {
  actions: CategoryAllocationPanelActions;
  model: CategoryAllocationPanelModel;
};

function CategoryAllocationPanel({
  actions,
  model,
}: CategoryAllocationPanelProps) {
  const showBeta = model.capabilities.hasStoredRiskMetrics;
  const canShowAlphaCalculator = showBeta;
  const [showAlphaCalculator, setShowAlphaCalculator] = useState(false);
  const isHistorical = model.viewModel.mode === 'historical';
  const hasSyncedPortfolioState = model.capabilities.lastPortfolioSyncAt !== null;
  const returnRows = isHistorical
    ? model.viewModel.rows.filter((row) => row.returnPercent !== null)
    : model.viewModel.rows;

  if (!model.viewModel.hasPositionSnapshots) {
    return (
      <p className='text-sm text-muted-foreground'>
        {!model.capabilities.canSyncPortfolioState
          ? 'Add Trading 212 API credentials to sync portfolio state.'
          : hasSyncedPortfolioState
            ? 'No current holdings to chart.'
            : 'Sync portfolio state to see allocation.'}
      </p>
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
          {model.capabilities.canSyncPortfolioState
            ? 'No current holdings to chart.'
          : 'Add Trading 212 API credentials to sync portfolio state.'}
        </p>
      </div>
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

  return (
    <div className='flex flex-col gap-8'>
      <FillDateRangePicker
        onChange={actions.setFillDateRangeFilter}
        value={model.fillDateRangeFilter}
      />

      {canShowAlphaCalculator ? (
        <div className='flex flex-col gap-3'>
          <div>
            <Button
              onClick={() => setShowAlphaCalculator((current) => !current)}
              type='button'
              variant='outline'
            >
              {showAlphaCalculator
                ? 'Hide alpha calculator'
                : 'Show alpha calculator'}
            </Button>
          </div>

          {showAlphaCalculator ? (
            <CategoryAlphaAssumptions
              isHistorical={isHistorical}
              marketReturn={model.alphaMarketReturn}
              onChange={actions.setAlphaAssumptions}
              periodLabel={model.viewModel.alphaPeriodLabel}
              riskFreeAnnual={model.alphaRiskFreeAnnual}
            />
          ) : null}
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>
          {model.capabilities.hasFmpApiKey
            ? 'Risk metrics enabled, but no beta data has been synced yet.'
            : 'Risk metrics disabled. Add FMP key and sync beta data to see beta and alpha.'}
        </p>
      )}

      {model.viewModel.mode === 'current' &&
      model.capabilities.hasFmpApiKey &&
      model.unresolvedCurrentHoldingsCount > 0 ? (
        <div className='flex flex-col gap-2 border border-border p-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {model.unresolvedCurrentHoldingsCount} current holding
            {model.unresolvedCurrentHoldingsCount === 1 ? '' : 's'} need
            FMP mapping to improve beta coverage.
          </p>
          <Button
            onClick={actions.openRiskMappings}
            type='button'
            variant='outline'
          >
            Review risk mappings
          </Button>
        </div>
      ) : null}

      <CategoryAllocationSummary
        hideValues={model.hideValues}
        isHistorical={isHistorical}
        showBeta={showBeta}
        showAlpha={showAlphaCalculator}
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
        showBeta={showBeta}
        showAlpha={showAlphaCalculator}
      />
    </div>
  );
}

export { CategoryAllocationPanel };
