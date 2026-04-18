'use client';

import { OrdersFilterPanel } from '@/app/_components/OrdersFilterPanel';
import { OrdersSyncMenu } from '@/app/_components/OrdersSyncMenu';
import { PrivacyToggleButton } from '@/app/_components/PrivacyToggleButton';
import { useOrdersExplorerQuery } from '@/lib/client/orders/useOrdersExplorerQuery';
import { usePortfolioStateSync } from '@/lib/client/portfolio/usePortfolioStateSync';

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
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='font-mono text-2xl sm:text-3xl'>Orders</h1>
          <p className='text-sm text-muted-foreground'>
            Explore positions and trigger syncs.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <PrivacyToggleButton />
          <OrdersSyncMenu />
        </div>
      </div>

      <OrdersFilterPanel
        instruments={data.instruments}
        latestAccountSummarySnapshot={data.latestAccountSummarySnapshot}
        orders={data.orders}
      />
    </div>
  );
}
