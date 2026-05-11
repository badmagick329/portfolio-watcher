import { CircleHelp } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const METRIC_HELP_TEXT = {
  averageCost:
    'Shown per share. When broker position data includes original instrument currency, that value is shown first with wallet currency in brackets.',
  costBasis: 'Total amount allocated to the shares you still hold.',
  realizedPnL:
    'Profit or loss already locked in from earlier sells for this instrument.',
  unrealizedPnL:
    'Current value minus cost basis for the shares you still hold.',
  netCashflow: 'Historical money in and out across all buys and sells.',
  priceOverride:
    'Override the current valuation price here. Save stores this value as the latest manual price for this instrument.',
} as const;

function MetricLabelWithTooltip({
  label,
  helpText,
}: {
  label: string;
  helpText?: string;
}) {
  if (!helpText) {
    return <span>{label}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            className='inline-flex items-center gap-1 text-left'
          >
            <span>{label}</span>
            <CircleHelp className='size-3 text-muted-foreground' />
          </button>
        </TooltipTrigger>
        <TooltipContent>{helpText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { METRIC_HELP_TEXT, MetricLabelWithTooltip };
