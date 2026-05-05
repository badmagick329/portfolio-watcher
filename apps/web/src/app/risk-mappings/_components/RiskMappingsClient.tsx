'use client';

import { AppSetupStatusPanel } from '@/app/_components/AppSetupStatusPanel';
import { RiskMappingsPanel } from '@/app/categories/_components/RiskMappingsPanel';
import { useRiskMappingsController } from '@/lib/client/categories/useRiskMappingsController';

function RiskMappingsClient() {
  const { actions, model, status } = useRiskMappingsController();

  if (status.state === 'loading') {
    return <p>Loading risk mappings...</p>;
  }

  if (status.state === 'error') {
    return <p>{status.message}</p>;
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-8'>
      <AppSetupStatusPanel capabilities={model.capabilities} />
      <RiskMappingsPanel actions={actions} model={model} />
    </div>
  );
}

export { RiskMappingsClient };
