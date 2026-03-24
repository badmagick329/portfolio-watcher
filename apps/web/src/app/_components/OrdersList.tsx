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
import { useEffect, useState } from 'react';

type OrdersListProps = {
  orders: WebHistoricalOrder[];
};

function getDisplayPriceContext(order: WebHistoricalOrder) {
  const latestFill = order.fills.reduce<(typeof order.fills)[number] | null>(
    (latest, fill) => {
      if (!latest) {
        return fill;
      }

      return fill.filledAt > latest.filledAt ? fill : latest;
    },
    null,
  );

  if (!latestFill) {
    return null;
  }

  return {
    currency: order.instrument.currency,
    price: latestFill.price,
    walletDivisor: latestFill.walletImpact.fxRate,
  };
}

function getOrderQuantity(order: WebHistoricalOrder) {
  const quantity = order.filledQuantity ?? order.quantity;

  if (quantity === null) {
    return null;
  }

  return Math.abs(quantity);
}

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

function getWeightedDisplayedOrderPrice(order: WebHistoricalOrder) {
  if (order.fills.length === 0) {
    return null;
  }

  const totalQuantity = order.fills.reduce(
    (sum, fill) => sum + Math.abs(fill.quantity),
    0,
  );

  if (totalQuantity === 0) {
    return null;
  }

  return (
    order.fills.reduce(
      (sum, fill) => sum + fill.price * Math.abs(fill.quantity),
      0,
    ) / totalQuantity
  );
}

function formatOrderPrice(order: WebHistoricalOrder) {
  const weightedPrice = getWeightedDisplayedOrderPrice(order);

  if (weightedPrice === null) {
    return 'n/a';
  }

  return `${weightedPrice} ${order.instrument.currency}`;
}

export function OrdersList({ orders }: OrdersListProps) {
  const netCashflow = orders.reduce((sum, order) => {
    const amount = getSignedOrderAmount(order);

    return amount === null ? sum : sum + amount;
  }, 0);
  const currencies = new Set(orders.map((order) => order.currency));
  const currency = currencies.size === 1 ? orders[0]?.currency : null;

  const positionsByTicker = new Map<
    string,
    {
      quantity: number;
      latestPrice: number | null;
      latestFilledAt: string | null;
      displayCurrency: string | null;
      walletDivisor: number | null;
    }
  >();

  orders.forEach((order) => {
    const quantity = getOrderQuantity(order) ?? 0;
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;
    const priceContext = getDisplayPriceContext(order);
    const latestFilledAt = order.fills.reduce<string | null>((latest, fill) => {
      if (!latest) {
        return fill.filledAt;
      }

      return fill.filledAt > latest ? fill.filledAt : latest;
    }, null);
    const existing = positionsByTicker.get(order.ticker) ?? {
      quantity: 0,
      latestPrice: null,
      latestFilledAt: null,
      displayCurrency: null,
      walletDivisor: null,
    };

    existing.quantity += signedQuantity;

    if (
      priceContext &&
      latestFilledAt &&
      (!existing.latestFilledAt || latestFilledAt > existing.latestFilledAt)
    ) {
      existing.latestFilledAt = latestFilledAt;
      existing.latestPrice = priceContext.price;
      existing.displayCurrency = priceContext.currency;
      existing.walletDivisor = priceContext.walletDivisor;
    }

    positionsByTicker.set(order.ticker, existing);
  });

  const estimatedCurrentValue = Array.from(positionsByTicker.values()).reduce(
    (sum, position) => {
      if (position.latestPrice === null || position.walletDivisor === null) {
        return sum;
      }

      return (
        sum +
        (position.quantity * position.latestPrice) / position.walletDivisor
      );
    },
    0,
  );
  const remainingQuantity = Array.from(positionsByTicker.values()).reduce(
    (sum, position) => sum + position.quantity,
    0,
  );
  const latestPrices = Array.from(positionsByTicker.values())
    .map((position) => position.latestPrice)
    .filter((price): price is number => price !== null);
  const displayCurrencies = Array.from(positionsByTicker.values())
    .map((position) => position.displayCurrency)
    .filter((value): value is string => value !== null);
  const walletDivisors = Array.from(positionsByTicker.values())
    .map((position) => position.walletDivisor)
    .filter((value): value is number => value !== null);
  const defaultPriceUsed = latestPrices.length === 1 ? latestPrices[0] : null;
  const [manualPriceInput, setManualPriceInput] = useState('');

  useEffect(() => {
    setManualPriceInput(
      defaultPriceUsed === null ? '' : String(defaultPriceUsed),
    );
  }, [defaultPriceUsed, orders]);

  const parsedManualPrice =
    manualPriceInput.trim() === '' ? null : Number(manualPriceInput);
  const effectivePriceUsed =
    parsedManualPrice !== null && Number.isFinite(parsedManualPrice)
      ? parsedManualPrice
      : (defaultPriceUsed ?? null);
  const effectiveWalletDivisor =
    walletDivisors.length === 1 ? (walletDivisors[0] ?? null) : null;
  const effectiveCurrentValue =
    effectivePriceUsed !== null && effectiveWalletDivisor !== null
      ? (remainingQuantity * effectivePriceUsed) / effectiveWalletDivisor
      : estimatedCurrentValue;
  const estimatedTotal = netCashflow + effectiveCurrentValue;

  return (
    <div className='flex flex-col gap-4 items-center'>
      <div className='flex flex-col items-center gap-1'>
        <p>
          Estimated total:{' '}
          {currency
            ? `${estimatedTotal >= 0 ? '+' : '-'}${Math.abs(estimatedTotal)} ${currency}`
            : 'n/a (mixed currencies)'}
        </p>
        {currency && remainingQuantity > 0 ? (
          <div className='flex flex-col items-center gap-1'>
            <p>
              Holding: {remainingQuantity} shares | Value used:{' '}
              {`${effectiveCurrentValue >= 0 ? '+' : '-'}${Math.abs(effectiveCurrentValue)} ${currency}`}
            </p>
            <label className='flex items-center gap-2'>
              <span>Price used:</span>
              <input
                className='w-32 border border-input bg-background px-2 py-1 text-sm'
                type='number'
                step='any'
                value={manualPriceInput}
                onChange={(event) => setManualPriceInput(event.target.value)}
              />
              <span>
                {displayCurrencies.length === 1 ? displayCurrencies[0] : ''}
              </span>
            </label>
          </div>
        ) : null}
      </div>

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
              <TableCell>{getOrderQuantity(order) ?? 'n/a'}</TableCell>
              <TableCell>{formatOrderPrice(order)}</TableCell>
              <TableCell>{formatOrderAmount(order)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
