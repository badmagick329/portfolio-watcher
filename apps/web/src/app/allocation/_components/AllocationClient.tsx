'use client';

import { AppSetupStatusPanel } from '@/app/_components/AppSetupStatusPanel';
import { PrivacyToggleButton } from '@/app/_components/PrivacyToggleButton';
import { CategoryAllocationPanel } from '@/app/categories/_components/CategoryAllocationPanel';
import { useAllocationController } from '@/lib/client/categories/useAllocationController';

function AllocationClient() {
  const { actions, model, status } = useAllocationController();

  if (status.state === 'loading') {
    return <p>Loading allocation...</p>;
  }

  if (status.state === 'error') {
    return <p>{status.message}</p>;
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='font-mono text-2xl sm:text-3xl'>
            Portfolio Allocation
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <PrivacyToggleButton />
        </div>
      </div>

      <AppSetupStatusPanel capabilities={model.capabilities} />
      <CategoryAllocationPanel actions={actions} model={model} />
    </div>
  );
}

export { AllocationClient };
