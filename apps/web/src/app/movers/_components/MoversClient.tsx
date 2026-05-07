'use client';

import { AppSetupStatusPanel } from '@/app/_components/AppSetupStatusPanel';
import { PrivacyToggleButton } from '@/app/_components/PrivacyToggleButton';
import { useMoversController } from '@/lib/client/movers/useMoversController';
import { MoversPanel } from './MoversPanel';

function MoversClient() {
  const { actions, model, status } = useMoversController();

  if (status.state === 'loading') {
    return <p>Loading movers...</p>;
  }

  if (status.state === 'error') {
    return <p>{status.message}</p>;
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='font-mono text-2xl sm:text-3xl'>Movers</h1>
          <p className='text-sm text-muted-foreground'>
            Current holding movement over a selected period.
          </p>
        </div>
        <PrivacyToggleButton />
      </div>

      <AppSetupStatusPanel capabilities={model.capabilities} />
      <MoversPanel actions={actions} model={model} />
    </div>
  );
}

export { MoversClient };
