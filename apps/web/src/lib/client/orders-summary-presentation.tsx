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
  provider?: EffectiveInstrumentPrice['provider'] | null,
) =>
  source === 'manual'
    ? 'Manual override'
    : source === 'stored'
      ? getStoredPriceProviderLabel(provider)
      : source === 'derived_from_fill'
        ? 'Derived from fill'
        : 'n/a';

const getStoredPriceProviderLabel = (
  provider?: EffectiveInstrumentPrice['provider'] | null,
) =>
  provider === 'manual'
    ? 'Manual (saved)'
    : provider === 't212'
      ? 'Trading 212'
      : provider === 'eodhd'
        ? 'EODHD'
        : provider === 'fmp'
          ? 'FMP'
          : 'Stored';

const METRIC_HELP_TEXT = {
  averageCost: 'Weighted average cost per share for the shares you still hold.',
  costBasis: 'Total amount allocated to the shares you still hold.',
  realizedPnL:
    'Profit or loss already locked in from earlier sells for this instrument.',
  unrealizedPnL:
    'Current value minus cost basis for the shares you still hold.',
  netCashflow: 'Historical money in and out across all buys and sells.',
  priceOverride:
    'Override the current valuation price here. Save stores this value as the latest manual price for this instrument.',
} as const;

const formatDisplayDateTime = (value: string | null | undefined) => {
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

const formatCompactDisplayDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'n/a';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'n/a';
  }

  const year = parsedDate.getFullYear();
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsedDate.getDate()}`.padStart(2, '0');
  const hours = `${parsedDate.getHours()}`.padStart(2, '0');
  const minutes = `${parsedDate.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const getCurrentTimeZoneAbbreviation = () => {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  }).formatToParts(new Date());
  const timeZoneNamePart = parts.find((part) => part.type === 'timeZoneName');

  return timeZoneNamePart?.value ?? 'Local';
};

const formatPriceAsOf = (value: string | null | undefined) =>
  formatDisplayDateTime(value);

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
  formatCompactDisplayDateTime,
  formatDisplayDateTime,
  formatPriceAsOf,
  getCurrentTimeZoneAbbreviation,
  getCurrentPriceSourceLabel,
  METRIC_HELP_TEXT,
  MetricLabelWithTooltip,
};
