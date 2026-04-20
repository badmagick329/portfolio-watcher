'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { formatPercent } from '@/lib/client/presentation/format-values';

type CategoryAlphaAssumptionsProps = {
  isHistorical: boolean;
  marketReturn: number;
  onChange: (value: { marketReturn?: number; riskFreeAnnual?: number }) => void;
  periodLabel: string | null;
  riskFreeAnnual: number;
};

function CategoryAlphaAssumptions({
  isHistorical,
  marketReturn,
  onChange,
  periodLabel,
  riskFreeAnnual,
}: CategoryAlphaAssumptionsProps) {
  return (
    <div className='flex flex-col gap-3 border border-border p-3'>
      <div className='space-y-1'>
        <h2 className='font-mono text-lg'>CAPM assumptions</h2>
        <p className='text-sm text-muted-foreground'>
          {isHistorical
            ? 'Filtered alpha uses the selected fill date range. Enter market return for that same period.'
            : 'Current alpha uses the period from first known fill in this view to latest valuation. Enter market return for that same period.'}
        </p>
        {periodLabel ? (
          <p className='text-xs text-muted-foreground'>
            Alpha period: {periodLabel}
          </p>
        ) : (
          <p className='text-xs text-muted-foreground'>
            Alpha period unavailable until current holdings have known fills and
            valuations, or until filtered orders provide a usable date range.
          </p>
        )}
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='space-y-1 text-sm'>
          <span className='text-muted-foreground'>Market return</span>
          <PercentInput
            ariaLabel='Market return'
            onChange={(value) => onChange({ marketReturn: value })}
            value={marketReturn}
          />
          <span className='block text-xs text-muted-foreground'>
            For alpha period, currently {formatPercent(marketReturn)}.
          </span>
        </label>
        <label className='space-y-1 text-sm'>
          <span className='text-muted-foreground'>Risk-free rate, annual</span>
          <PercentInput
            ariaLabel='Risk-free rate, annual'
            min={-99.9}
            onChange={(value) => onChange({ riskFreeAnnual: value })}
            value={riskFreeAnnual}
          />
          <span className='block text-xs text-muted-foreground'>
            Annualized, currently {formatPercent(riskFreeAnnual)}.
          </span>
        </label>
      </div>
    </div>
  );
}

function PercentInput({
  ariaLabel,
  min,
  onChange,
  value,
}: {
  ariaLabel: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        aria-label={ariaLabel}
        min={min}
        onChange={(event) => {
          const nextValue = Number(event.target.value);

          if (Number.isFinite(nextValue)) {
            onChange(nextValue / 100);
          }
        }}
        step='0.1'
        type='number'
        value={formatPercentInputValue(value)}
      />
      <InputGroupAddon align='inline-end'>%</InputGroupAddon>
    </InputGroup>
  );
}

const formatPercentInputValue = (value: number) =>
  Number.isInteger(value * 100)
    ? String(value * 100)
    : (value * 100).toFixed(1);

export { CategoryAlphaAssumptions };
