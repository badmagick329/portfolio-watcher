'use client';

import { PrivacyToggleButton } from '@/app/_components/PrivacyToggleButton';
import { Button } from '@/components/ui/button';
import { CategoryAllocationPanel } from './CategoryAllocationPanel';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import { useInstrumentCategoriesController } from '@/lib/client/categories/useInstrumentCategoriesController';

function InstrumentCategoriesClient() {
  const {
    allocationActions,
    allocationModel,
    headerActions,
    headerModel,
    managementActions,
    managementModel,
    status,
  } = useInstrumentCategoriesController();

  if (status.state === 'loading') {
    return <p>Loading categories...</p>;
  }

  if (status.state === 'error') {
    return <p>{status.message}</p>;
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='font-mono text-2xl sm:text-3xl'>
            Instrument Categories
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <PrivacyToggleButton />
          <Button
            onClick={() => headerActions.setMode('manage')}
            type='button'
            variant={headerModel.mode === 'manage' ? 'default' : 'outline'}
          >
            Manage categories
          </Button>
          <Button
            onClick={() => headerActions.setMode('allocation')}
            type='button'
            variant={headerModel.mode === 'allocation' ? 'default' : 'outline'}
          >
            Portfolio allocation
          </Button>
        </div>
      </div>

      {headerModel.mode === 'allocation' ? (
        <CategoryAllocationPanel
          actions={allocationActions}
          model={allocationModel}
        />
      ) : (
        <CategoryManagementPanel
          actions={managementActions}
          model={managementModel}
        />
      )}
    </div>
  );
}

export { InstrumentCategoriesClient };
