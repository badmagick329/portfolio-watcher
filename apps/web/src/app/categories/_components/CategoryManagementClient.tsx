'use client';

import { AppSetupStatusPanel } from '@/app/_components/AppSetupStatusPanel';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import { useCategoryManagementController } from '@/lib/client/categories/useCategoryManagementController';

function CategoryManagementClient() {
  const { actions, model, status } = useCategoryManagementController();

  if (status.state === 'loading') {
    return <p>Loading categories...</p>;
  }

  if (status.state === 'error') {
    return <p>{status.message}</p>;
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <div className='space-y-1'>
        <h1 className='font-mono text-2xl sm:text-3xl'>Instrument Categories</h1>
      </div>
      <AppSetupStatusPanel capabilities={model.capabilities} />
      <CategoryManagementPanel actions={actions} model={model} />
    </div>
  );
}

export { CategoryManagementClient };
