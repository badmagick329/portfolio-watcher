import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  getSignedOrderAmount,
  getWeightedDisplayedOrderPrice,
} from './orders-list-math';

function formatSignedCurrencyAmount(amount: number | null, currency: string) {
  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount >= 0 ? '+' : '-'}${Math.abs(amount).toFixed(2)} ${currency}`;
}

function formatUnsignedCurrencyAmount(amount: number | null, currency: string) {
  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

function formatInstrumentPrice(
  amount: number | null,
  currency: string | null,
  decimals = 3,
) {
  if (amount === null || !currency) {
    return 'n/a';
  }

  return `${amount.toFixed(decimals)} ${currency}`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return 'n/a';
  }

  return `${value >= 0 ? '+' : '-'}${Math.abs(value * 100).toFixed(2)}%`;
}

function formatShareQuantity(quantity: number | null) {
  if (quantity === null) {
    return 'n/a';
  }

  return quantity.toFixed(4);
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

export {
  formatInstrumentPrice,
  formatOrderAmount,
  formatOrderPrice,
  formatPercentage,
  formatShareQuantity,
  formatSignedCurrencyAmount,
  formatUnsignedCurrencyAmount,
};
