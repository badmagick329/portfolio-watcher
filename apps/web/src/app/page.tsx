import OrdersExplorer from '@/app/_components/OrdersExplorer';

export default function Home() {
  return (
    <div className='flex min-h-screen w-full flex-col bg-background font-sans pt-8'>
      <div className='container mx-auto'>
        <OrdersExplorer />
      </div>
    </div>
  );
}
