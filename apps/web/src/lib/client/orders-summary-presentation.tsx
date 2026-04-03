import { CircleHelp } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type { EffectiveInstrumentPrice } from './instrument-price';

const getCurrentPriceSourceLabel = (
  source: EffectiveInstrumentPrice['source'] | null | undefined,
) =>
  source === 'manual'
    ? 'Manual'
    : source === 'stored'
      ? 'Stored'
      : source === 'derived_from_fill'
        ? 'Derived from fill'
        : 'n/a';

const METRIC_HELP_TEXT = {
  averageCost: 'Weighted average cost per share for the shares you still hold.',
  costBasis: 'Total amount allocated to the shares you still hold.',
  unrealizedPnL:
    'Current value minus cost basis for the shares you still hold.',
  netCashflow: 'Historical money in and out across all buys and sells.',
  priceOverride:
    'Override the current valuation price here. Save stores this value as the latest manual price for this instrument.',
} as const;

const formatPriceAsOf = (value: string | null | undefined) => {
  if (!value) {
    return 'n/a';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsedDate);
};

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

export {
  formatPriceAsOf,
  getCurrentPriceSourceLabel,
  METRIC_HELP_TEXT,
  MetricLabelWithTooltip,
};
