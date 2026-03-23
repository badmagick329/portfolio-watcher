import { getOrdersAction } from '@/actions/orders-action';

export default async function Temp() {
  const orders = await getOrdersAction();
  return (
    <div className='flex flex-col items-center grow'>
      <pre>
        {orders.items
          .toSorted(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          )
          .map((order) => {
            return (
              <p key={order.id}>{`${order.createdAt} - ${order.ticker}`}</p>
            );
          })}
      </pre>
    </div>
  );
}
