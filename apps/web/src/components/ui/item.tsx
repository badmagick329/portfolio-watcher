import * as React from 'react';

import { cn } from '@/lib/utils';

function Item({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='item'
      className={cn(
        'flex flex-col items-start justify-between gap-2 py-2 sm:flex-row sm:gap-4',
        className,
      )}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='item-content'
      className={cn('min-w-0', className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='item-title'
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

function ItemDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='item-description'
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function ItemValue({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='item-value'
      className={cn(
        'w-full text-left text-sm font-medium break-words sm:w-auto sm:max-w-[45%] sm:text-right',
        className,
      )}
      {...props}
    />
  );
}

export { Item, ItemContent, ItemDescription, ItemTitle, ItemValue };
