import { formatCategoryName } from '@/lib/client/categories/display-category';
import type { CategoryAllocationRow } from '@/lib/client/categories/instrument-category-allocation';
import {
  formatMoney,
  formatPercent,
  NA_LABEL,
} from '@/lib/client/presentation/format-values';

type TooltipProps = {
  active?: boolean;
  hideValues?: boolean;
  mode?: 'current' | 'historical';
  payload?: Array<{ payload: unknown }>;
};

function AllocationTooltip({
  active,
  hideValues = false,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>Value: {formatMoney(row.currentValue, { hideValues })}</p>
      <p>Share: {formatPercent(row.allocationPercent)}</p>
      <p>Holdings: {row.holdingCount}</p>
    </div>
  );
}

function NetInvestedTooltip({
  active,
  hideValues = false,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>Buys: {formatMoney(row.buyCost ?? 0, { hideValues })}</p>
      <p>Sells: {formatMoney(row.sellProceeds ?? 0, { hideValues })}</p>
      <p>Net invested: {formatMoney(row.netInvested ?? 0, { hideValues })}</p>
      <p>Instruments: {row.holdingCount}</p>
    </div>
  );
}

function ReturnTooltip({
  active,
  hideValues = false,
  mode,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>
        Return:{' '}
        {row.returnPercent === null
          ? NA_LABEL
          : formatPercent(row.returnPercent)}
      </p>
      <p>
        {mode === 'historical' ? 'P/L' : 'Unrealized P/L'}:{' '}
        {row.unrealizedPnl === null
          ? NA_LABEL
          : formatMoney(row.unrealizedPnl, { hideValues })}
      </p>
    </div>
  );
}

export { AllocationTooltip, NetInvestedTooltip, ReturnTooltip };
