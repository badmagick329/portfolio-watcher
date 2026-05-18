import { Suspense } from 'react';
import { getAppCapabilities } from '@/lib/server/composition';
import { RiskMappingsClient } from './_components/RiskMappingsClient';

export default async function RiskMappingsPage() {
  const capabilitiesResult = await getAppCapabilities();
  const riskMetricsEnabled =
    capabilitiesResult.isOk() &&
    capabilitiesResult.value.riskMetricsFeatureEnabled;

  return (
    <div className='flex min-h-screen w-full flex-col bg-background font-sans pt-8'>
      <div className='mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8'>
        {riskMetricsEnabled ? (
          <Suspense fallback={<p>Loading risk mappings...</p>}>
            <RiskMappingsClient />
          </Suspense>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Risk metrics feature is disabled.
          </p>
        )}
      </div>
    </div>
  );
}
