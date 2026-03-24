'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buildOrdersListRows } from '@/lib/client/orders-list-rows';
import { buildOrdersSummary } from '@/lib/client/orders-list-math';
import type { WebHistoricalOrder } from '@portfolio/domain';
import { OrdersSummary } from './OrdersSummary';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
};

export function OrdersList({ orders }: OrdersListProps) {
  const initialSummary = buildOrdersSummary(orders);
  const [manualPriceInput, setManualPriceInput] = useState(
    initialSummary.manualPriceInput,
  );
  const summary = buildOrdersSummary(orders, manualPriceInput);
  const rows = buildOrdersListRows(orders);

  return (
    <div className='flex flex-col gap-4 items-center'>
      <OrdersSummary
        walletCurrency={summary.walletCurrency}
        remainingQuantity={summary.remainingQuantity}
        estimatedTotal={summary.estimatedTotal}
        estimatedPositionValue={summary.estimatedPositionValue}
        manualPriceInput={manualPriceInput}
        setManualPriceInput={setManualPriceInput}
        instrumentPriceCurrency={summary.instrumentPriceCurrency}
      />

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
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.instrumentName}</TableCell>
              <TableCell>{row.side}</TableCell>
              <TableCell>{row.quantityDisplay}</TableCell>
              <TableCell>{row.priceDisplay}</TableCell>
              <TableCell>{row.amountDisplay}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
