'use client';

import type { CategoryAllocationViewModel } from '@/lib/client/categories/instrument-category-allocation';
import {
  NA_LABEL,
  formatBeta,
  formatMoney,
  formatPercent,
} from '@/lib/client/presentation/format-values';
import {
  getSignedTone,
  getToneTextClassName,
} from '@/lib/client/presentation/presentation-tone';
import type { PresentationTone } from '@/lib/client/presentation/presentation-tone';
import { cn } from '@/lib/utils';

type CategoryAllocationSummaryProps = {
  hideValues: boolean;
  isHistorical: boolean;
  viewModel: CategoryAllocationViewModel;
};

function CategoryAllocationSummary({
  hideValues,
  isHistorical,
  viewModel,
}: CategoryAllocationSummaryProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-3 xl:grid-cols-6'>
      <PortfolioSummaryMetric
        label={isHistorical ? 'Net invested' : 'Value'}
        value={formatMoney(viewModel.totalCurrentValue, { hideValues })}
      />
      <PortfolioSummaryMetric
        label={isHistorical ? 'P/L' : 'Unrealized P/L'}
        tone={getSignedTone(viewModel.totalPnl)}
        value={
          viewModel.totalPnl === null
            ? NA_LABEL
            : formatMoney(viewModel.totalPnl, { hideValues })
        }
      />
      <PortfolioSummaryMetric
        label='Return'
        tone={getSignedTone(viewModel.totalReturnPercent)}
        value={
          viewModel.totalReturnPercent === null
            ? NA_LABEL
            : formatPercent(viewModel.totalReturnPercent)
        }
      />
      <PortfolioSummaryMetric
        label='Portfolio beta'
        value={
          viewModel.portfolioBeta === null
            ? NA_LABEL
            : formatBeta(viewModel.portfolioBeta)
        }
      />
      <PortfolioSummaryMetric
        label='Beta coverage'
        value={
          viewModel.betaCoveragePercent === null
            ? NA_LABEL
            : formatPercent(viewModel.betaCoveragePercent)
        }
      />
      <PortfolioSummaryMetric
        label='Portfolio alpha'
        tone={getSignedTone(viewModel.portfolioAlpha)}
        value={
          viewModel.portfolioAlpha === null
            ? NA_LABEL
            : formatPercent(viewModel.portfolioAlpha)
        }
      />
    </div>
  );
}

function PortfolioSummaryMetric({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: PresentationTone;
  value: string;
}) {
  return (
    <div className='space-y-1'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className={cn('font-mono text-2xl', getToneTextClassName(tone))}>
        {value}
      </p>
    </div>
  );
}

export { CategoryAllocationSummary };
