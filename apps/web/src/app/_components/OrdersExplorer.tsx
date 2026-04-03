'use client';

import { InstrumentPicker } from '@/app/_components/InstrumentPicker';
import { useOrdersExplorerQuery } from '@/lib/client/useOrdersExplorerQuery';
import { usePortfolioStateSync } from '@/lib/client/usePortfolioStateSync';

export default function OrdersExplorer() {
  const { data, error, isLoading } = useOrdersExplorerQuery();

  usePortfolioStateSync();

  if (isLoading) {
    return <p>Loading orders...</p>;
  }

  if (error || !data) {
    return (
      <p>{error instanceof Error ? error.message : 'Failed to load orders.'}</p>
    );
  }

  return (
    <div className='flex w-full grow flex-col items-stretch gap-12'>
      <InstrumentPicker
        instruments={data.instruments}
        latestAccountSummarySnapshot={data.latestAccountSummarySnapshot}
        orders={data.orders}
      />
    </div>
  );
}
