'use client';

import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
};

function formatOrderAmount(order: WebHistoricalOrder) {
  const amount = order.filledValue ?? order.value;

  if (amount === null) {
    return `n/a ${order.currency}`;
  }

  const absoluteAmount = Math.abs(amount);
  const sign = order.side === 'SELL' ? '+' : '-';

  return `${sign}${absoluteAmount} ${order.currency}`;
}

export function OrdersList({ orders }: OrdersListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Instrument</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{order.createdAt}</TableCell>
            <TableCell>{order.instrument.name}</TableCell>
            <TableCell>{order.side}</TableCell>
            <TableCell>{order.filledQuantity ?? order.quantity ?? 'n/a'}</TableCell>
            <TableCell>{formatOrderAmount(order)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
