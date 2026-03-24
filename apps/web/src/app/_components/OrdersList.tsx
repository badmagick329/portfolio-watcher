'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WebHistoricalOrder } from '@portfolio/domain';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
};

function getSignedOrderAmount(order: WebHistoricalOrder) {
  const amount = order.filledValue ?? order.value;

  if (amount === null) {
    return null;
  }

  const absoluteAmount = Math.abs(amount);
  return order.side === 'SELL' ? absoluteAmount : -absoluteAmount;
}

function formatOrderAmount(order: WebHistoricalOrder) {
  const amount = getSignedOrderAmount(order);

  if (amount === null) {
    return `n/a ${order.currency}`;
  }

  return `${amount >= 0 ? '+' : '-'}${Math.abs(amount)} ${order.currency}`;
}

function formatOrderPrice(order: WebHistoricalOrder) {
  if (order.fills.length === 0) {
    return 'n/a';
  }

  const totalQuantity = order.fills.reduce(
    (sum, fill) => sum + fill.quantity,
    0,
  );

  if (totalQuantity === 0) {
    return 'n/a';
  }

  const weightedPrice =
    order.fills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0) /
    totalQuantity;

  return `${weightedPrice} ${order.currency}`;
}

export function OrdersList({ orders }: OrdersListProps) {
  const totalAmount = orders.reduce((sum, order) => {
    const amount = getSignedOrderAmount(order);

    return amount === null ? sum : sum + amount;
  }, 0);
  const currency = orders[0]?.currency;

  return (
    <div className='flex flex-col gap-4 items-center'>
      <p>
        Total:{' '}
        {currency
          ? `${totalAmount >= 0 ? '+' : '-'}${Math.abs(totalAmount)} ${currency}`
          : 'n/a'}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.createdAt}</TableCell>
              <TableCell>{order.instrument.name}</TableCell>
              <TableCell>{order.side}</TableCell>
              <TableCell>
                {order.filledQuantity ?? order.quantity ?? 'n/a'}
              </TableCell>
              <TableCell>{formatOrderPrice(order)}</TableCell>
              <TableCell>{formatOrderAmount(order)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
