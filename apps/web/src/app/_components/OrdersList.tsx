'use client';

import { useState, useTransition } from 'react';
import { saveManualInstrumentPriceAction } from '@/actions/instrument-prices-action';
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
import { buildOrdersSummary, parseManualPrice } from '@/lib/client/orders-list-math';
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
  const [storedPrice, setStoredPrice] = useState(latestStoredPrice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingPrice, startSavingPrice] = useTransition();
  const initialSummary = buildOrdersSummary(orders, storedPrice);
  const [manualPriceInput, setManualPriceInput] = useState(
    initialSummary.manualPriceInput,
  );
  const summary = buildOrdersSummary(orders, storedPrice, manualPriceInput);
  const rows = buildOrdersListRows(orders);
  const parsedManualPrice = parseManualPrice(manualPriceInput);
  const canSavePrice =
    parsedManualPrice !== null &&
    parsedManualPrice > 0 &&
    instrumentCurrency.trim() !== '';

  const handleSavePrice = () => {
    if (!canSavePrice || parsedManualPrice === null) {
      return;
    }

    setSaveError(null);
    startSavingPrice(async () => {
      try {
        const savedSnapshot = await saveManualInstrumentPriceAction({
          isin: instrumentIsin,
          price: parsedManualPrice,
          currency: instrumentCurrency,
        });

        setStoredPrice({
          price: savedSnapshot.price,
          currency: savedSnapshot.currency,
          asOf: savedSnapshot.asOf,
          priceType: savedSnapshot.priceType,
        });
        onStoredPriceSaved({
          price: savedSnapshot.price,
          currency: savedSnapshot.currency,
          asOf: savedSnapshot.asOf,
          priceType: savedSnapshot.priceType,
        });
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Failed to save price.');
      }
    });
  };

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
        canSavePrice={canSavePrice}
        isSavingPrice={isSavingPrice}
        onSavePrice={handleSavePrice}
        saveError={saveError}
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
