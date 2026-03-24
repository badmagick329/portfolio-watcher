import { getInstrumentsAction, getOrdersAction } from '@/actions/orders-action';

export default async function Temp() {
  const orders = await getOrdersAction();
  const instruments = await getInstrumentsAction();

  return (
    <div className='flex flex-col items-center grow gap-12'>
      <pre>
        {instruments.map((inst) => (
          <p key={inst.isin}>
            {inst.name} ({inst.ticker})
          </p>
        ))}
      </pre>
      <pre>
        {orders.items
          .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .map((order) => {
            return (
              <p key={order.id}>{`${order.createdAt} - ${order.ticker}`}</p>
            );
          })}
      </pre>
    </div>
  );
}
