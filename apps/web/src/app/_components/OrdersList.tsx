'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InstrumentStoredPrice } from '@/lib/client/instrument-price';
import { buildOrdersListRows } from '@/lib/client/orders-list-rows';
import { useOrdersSummaryController } from '@/lib/client/use-orders-summary-controller';
import type { WebHistoricalOrder } from '@portfolio/domain';
import { OrdersSummary } from './OrdersSummary';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
  latestStoredPrice: InstrumentStoredPrice | null;
  instrumentIsin: string;
  instrumentCurrency: string;
  onStoredPriceSaved: (latestStoredPrice: InstrumentStoredPrice) => void;
};

export function OrdersList({
  orders,
  latestStoredPrice,
  instrumentIsin,
  instrumentCurrency,
  onStoredPriceSaved,
}: OrdersListProps) {
  const rows = buildOrdersListRows(orders);
  const { viewModel, actions } = useOrdersSummaryController({
    orders,
    latestStoredPrice,
    instrumentIsin,
    instrumentCurrency,
    onStoredPriceSaved,
  });

  return (
    <div className='flex flex-col gap-4 items-center'>
      <OrdersSummary actions={actions} viewModel={viewModel} />

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
