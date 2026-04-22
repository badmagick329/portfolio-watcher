import { Suspense } from 'react';
import OrdersExplorer from '@/app/_components/OrdersExplorer';

export default function Home() {
  return (
    <div className='flex min-h-screen w-full flex-col bg-background font-sans pt-8'>
      <div className='mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8'>
        <Suspense fallback={<p>Loading orders...</p>}>
          <OrdersExplorer />
        </Suspense>
      </div>
    </div>
  );
}
