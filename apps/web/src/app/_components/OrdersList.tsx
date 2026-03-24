'use client';

import type { WebHistoricalOrder } from '@portfolio/domain';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
};

function formatOrderAmount(order: WebHistoricalOrder) {
  const amount = order.filledValue ?? order.value;

  if (amount === null) {
    return `n/a ${order.currency}`;
  }

  const sign = order.side === 'SELL' ? '+' : '-';

  return `${sign}${amount} ${order.currency}`;
}

export function OrdersList({ orders }: OrdersListProps) {
  return (
    <pre>
      {orders.map((order) => (
        <p key={order.id}>
          {[
            order.createdAt,
            formatOrderAmount(order),
            order.instrument.name,
            order.side,
            order.filledQuantity ?? order.quantity,
          ].join(' | ')}
        </p>
      ))}
    </pre>
  );
}
