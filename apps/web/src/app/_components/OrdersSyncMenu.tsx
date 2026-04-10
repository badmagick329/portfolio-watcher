'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrdersSyncActions } from '@/lib/client/useOrdersSyncActions';
import type { OrdersSyncActionKind } from '@/actions/sync-action-types';

const syncActions: Array<{
  kind: OrdersSyncActionKind;
  label: string;
}> = [
  { kind: 'orders', label: 'Sync orders' },
  { kind: 'portfolio-state', label: 'Sync portfolio state' },
  { kind: 'instruments', label: 'Sync instruments' },
];

export function OrdersSyncMenu() {
  const { activeKind, isPending, lastResult, sync } = useOrdersSyncActions();

  return (
    <div className='flex flex-col items-end gap-2'>
      <Popover>
        <PopoverTrigger asChild>
          <Button size='sm' type='button' variant='outline'>
            {isPending ? 'Syncing...' : 'Sync'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-56 p-2'>
          <div className='flex flex-col gap-2'>
            {syncActions.map((action) => (
              <Button
                key={action.kind}
                className='justify-start'
                disabled={isPending}
                onClick={() => sync(action.kind)}
                size='sm'
                type='button'
                variant='outline'
              >
                {isPending && activeKind === action.kind
                  ? `${action.label}...`
                  : action.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {lastResult ? (
        <p
          className={`text-xs ${
            lastResult.ok ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          {lastResult.message}
        </p>
      ) : null}
    </div>
  );
}
