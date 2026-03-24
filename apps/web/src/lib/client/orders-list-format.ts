import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  getSignedOrderAmount,
  getWeightedDisplayedOrderPrice,
} from './orders-list-math';

function formatSignedCurrencyAmount(amount: number | null, currency: string) {
  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount >= 0 ? '+' : '-'}${Math.abs(amount)} ${currency}`;
}

function formatOrderAmount(order: WebHistoricalOrder) {
  return formatSignedCurrencyAmount(
    getSignedOrderAmount(order),
    order.currency,
  );
}

function formatOrderPrice(order: WebHistoricalOrder) {
  const weightedPrice = getWeightedDisplayedOrderPrice(order);

  if (weightedPrice === null) {
    return 'n/a';
  }

  return `${weightedPrice} ${order.instrument.currency}`;
}

export { formatOrderAmount, formatOrderPrice, formatSignedCurrencyAmount };
