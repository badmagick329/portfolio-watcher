import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  getSignedOrderAmount,
  getWeightedDisplayedOrderPrice,
} from './orders-list-math';
import {
  formatHiddenCurrencyAmount,
  formatHiddenSignedCurrencyAmount,
} from './privacy-values';

type PrivacyFormatOptions = {
  hideValues?: boolean;
};

function formatSignedCurrencyAmount(
  amount: number | null,
  currency: string,
  options: PrivacyFormatOptions = {},
) {
  if (options.hideValues) {
    return formatHiddenSignedCurrencyAmount(amount, currency);
  }

  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount >= 0 ? '+' : '-'}${Math.abs(amount).toFixed(2)} ${currency}`;
}

function formatUnsignedCurrencyAmount(
  amount: number | null,
  currency: string,
  options: PrivacyFormatOptions = {},
) {
  if (options.hideValues && amount !== null) {
    return formatHiddenCurrencyAmount(currency);
  }

  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

function formatInstrumentPrice(
  amount: number | null,
  currency: string | null,
  decimals = 3,
  options: PrivacyFormatOptions = {},
) {
  if (amount === null || !currency) {
    return 'n/a';
  }

  if (options.hideValues) {
    return formatHiddenCurrencyAmount(currency);
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

function formatPrivateQuantity(
  quantity: number | null,
  options: PrivacyFormatOptions = {},
) {
  if (quantity === null) {
    return 'n/a';
  }

  return options.hideValues ? '••••' : quantity.toFixed(4);
}

function formatOrderAmount(
  order: WebHistoricalOrder,
  options: PrivacyFormatOptions = {},
) {
  return formatSignedCurrencyAmount(
    getSignedOrderAmount(order),
    order.currency,
    options,
  );
}

function formatOrderPrice(
  order: WebHistoricalOrder,
  options: PrivacyFormatOptions = {},
) {
  const weightedPrice = getWeightedDisplayedOrderPrice(order);

  if (weightedPrice === null) {
    return 'n/a';
  }

  if (options.hideValues) {
    return formatHiddenCurrencyAmount(order.instrument.currency);
  }

  return `${weightedPrice} ${order.instrument.currency}`;
}

export {
  formatInstrumentPrice,
  formatOrderAmount,
  formatOrderPrice,
  formatPercentage,
  formatPrivateQuantity,
  formatShareQuantity,
  formatSignedCurrencyAmount,
  formatUnsignedCurrencyAmount,
};
export type { PrivacyFormatOptions };
