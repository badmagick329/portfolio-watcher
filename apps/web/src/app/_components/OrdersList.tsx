'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InstrumentStoredPrice, InstrumentWithStoredPrice } from '@/lib/client/instrument-price';
import { buildOrdersListRows } from '@/lib/client/orders-list-rows';
import { useOrdersSummaryController } from '@/lib/client/useOrdersSummaryController';
import type { WebHistoricalOrder } from '@portfolio/domain';
import { OrdersSummary } from './OrdersSummary';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
  selectedInstruments: InstrumentWithStoredPrice[];
  onStoredPriceSaved: (
    isin: string,
    latestStoredPrice: InstrumentStoredPrice,
  ) => void;
};

export function OrdersList({
  orders,
  selectedInstruments,
  onStoredPriceSaved,
}: OrdersListProps) {
  const rows = buildOrdersListRows(orders);
  const { viewModel, actions } = useOrdersSummaryController({
    orders,
    selectedInstruments,
    onStoredPriceSaved,
  });

  return (
    <div className='flex w-full flex-col items-center gap-4'>
      <OrdersSummary actions={actions} viewModel={viewModel} />

      <div className='w-full overflow-x-auto'>
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
    </div>
  );
}
