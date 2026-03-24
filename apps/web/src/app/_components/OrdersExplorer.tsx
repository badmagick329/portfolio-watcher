import { getOrdersAction } from '@/actions/orders-action';
import { getDistinctInstrumentsAction } from '@/actions/instruments-action';
import { InstrumentPicker } from '@/app/_components/InstrumentPicker';

export default async function OrdersExplorer() {
  const orders = await getOrdersAction();
  const instruments = await getDistinctInstrumentsAction();

  return (
    <div className='flex w-full grow flex-col items-stretch gap-12'>
      <InstrumentPicker
        instruments={instruments}
        orders={orders.items.toSorted(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        )}
      />
    </div>
  );
}
