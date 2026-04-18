'use client';

import { CalendarIcon, XIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatQueryDate,
  parseQueryDate,
  type OrdersViewUrlState,
} from '@/lib/client/orders/orders-view-url-state';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FillDateRangePickerProps = {
  value: Pick<OrdersViewUrlState, 'filledFrom' | 'filledTo'>;
  onChange: (
    value: Pick<OrdersViewUrlState, 'filledFrom' | 'filledTo'>,
  ) => void;
};

const getRangeLabel = (value: Pick<OrdersViewUrlState, 'filledFrom' | 'filledTo'>) => {
  const fromDate = parseQueryDate(value.filledFrom);
  const toDate = parseQueryDate(value.filledTo);

  if (fromDate && toDate) {
    return `${format(fromDate, 'dd MMM yyyy')} - ${format(toDate, 'dd MMM yyyy')}`;
  }

  if (fromDate) {
    return `From ${format(fromDate, 'dd MMM yyyy')}`;
  }

  if (toDate) {
    return `Until ${format(toDate, 'dd MMM yyyy')}`;
  }

  return 'Filter by fill date';
};

export function FillDateRangePicker({
  value,
  onChange,
}: FillDateRangePickerProps) {
  const selectedRange: DateRange | undefined = {
    from: parseQueryDate(value.filledFrom) ?? undefined,
    to: parseQueryDate(value.filledTo) ?? undefined,
  };
  const hasValue = Boolean(value.filledFrom || value.filledTo);

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            className={cn(
              'justify-start text-left font-normal',
              !hasValue && 'text-muted-foreground',
            )}
          >
            <CalendarIcon />
            {getRangeLabel(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-0'>
          <Calendar
            mode='range'
            defaultMonth={selectedRange.from ?? selectedRange.to}
            selected={selectedRange}
            numberOfMonths={2}
            onSelect={(range) =>
              onChange({
                filledFrom: range?.from ? formatQueryDate(range.from) : undefined,
                filledTo: range?.to ? formatQueryDate(range.to) : undefined,
              })
            }
          />
        </PopoverContent>
      </Popover>

      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={!hasValue}
        onClick={() => onChange({ filledFrom: undefined, filledTo: undefined })}
      >
        <XIcon />
        Clear
      </Button>
    </div>
  );
}
