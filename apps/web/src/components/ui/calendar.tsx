import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        caption: 'relative flex h-8 items-center justify-center px-10 pt-1',
        caption_label: 'px-6 text-xs font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-xs' }),
          'absolute left-1 top-1 size-6 rounded-none p-0',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-xs' }),
          'absolute right-1 top-1 size-6 rounded-none p-0',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'w-8 text-[0.65rem] font-normal text-muted-foreground text-center',
        week: 'mt-1 flex w-max',
        day: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'size-8 rounded-none p-0 font-normal aria-selected:opacity-100',
        ),
        day_button: 'size-8 p-0 font-normal',
        range_start:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        range_end:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'border border-border',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'bg-muted text-foreground hover:bg-muted hover:text-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('size-3.5', iconClassName)} />
          ) : (
            <ChevronRight className={cn('size-3.5', iconClassName)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
