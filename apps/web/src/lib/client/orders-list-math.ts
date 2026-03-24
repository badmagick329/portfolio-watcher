import type { WebHistoricalOrder, WebHistoricalOrderFill } from '@portfolio/domain';

type DisplayPriceContext = {
  instrumentPriceCurrency: string;
  price: number;
  priceToWalletRateDivisor: number;
};

type OrdersSummary = {
  walletCurrency: string | null;
  remainingQuantity: number;
  estimatedCurrentValue: number;
  estimatedTotal: number;
  defaultInstrumentPriceUsed: number | null;
  instrumentPriceCurrency: string | null;
  estimatedPositionValue: number;
  instrumentPriceUsed: number | null;
  priceToWalletRateDivisor: number | null;
  manualPriceInput: string;
  netCashflow: number;
  parsedManualPrice: number | null;
};

function getLatestFill(order: WebHistoricalOrder): WebHistoricalOrderFill | null {
  return order.fills.reduce<WebHistoricalOrderFill | null>((latest, fill) => {
    if (!latest) {
      return fill;
    }

    return fill.filledAt > latest.filledAt ? fill : latest;
  }, null);
}

function getDisplayPriceContext(order: WebHistoricalOrder): DisplayPriceContext | null {
  const latestFill = getLatestFill(order);

  if (!latestFill) {
    return null;
  }

  return {
    instrumentPriceCurrency: order.instrument.currency,
    price: latestFill.price,
    priceToWalletRateDivisor: latestFill.walletImpact.fxRate,
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

function buildOrdersSummary(
  orders: WebHistoricalOrder[],
  manualPriceInput = '',
): OrdersSummary {
  const netCashflow = orders.reduce((sum, order) => {
    const amount = getSignedOrderAmount(order);

    return amount === null ? sum : sum + amount;
  }, 0);
  const currencies = new Set(orders.map((order) => order.currency));
  const walletCurrency =
    currencies.size === 1 ? orders[0]?.currency ?? null : null;

  const positionsByTicker = new Map<
    string,
    {
      quantity: number;
      latestPrice: number | null;
      latestFilledAt: string | null;
      instrumentPriceCurrency: string | null;
      priceToWalletRateDivisor: number | null;
    }
  >();

  orders.forEach((order) => {
    const quantity = getOrderQuantity(order) ?? 0;
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;
    const priceContext = getDisplayPriceContext(order);
    const latestFilledAt = getLatestFill(order)?.filledAt ?? null;
    const existing = positionsByTicker.get(order.ticker) ?? {
      quantity: 0,
      latestPrice: null,
      latestFilledAt: null,
      instrumentPriceCurrency: null,
      priceToWalletRateDivisor: null,
    };

    existing.quantity += signedQuantity;

    if (
      priceContext &&
      latestFilledAt &&
      (!existing.latestFilledAt || latestFilledAt > existing.latestFilledAt)
    ) {
      existing.latestFilledAt = latestFilledAt;
      existing.latestPrice = priceContext.price;
      existing.instrumentPriceCurrency = priceContext.instrumentPriceCurrency;
      existing.priceToWalletRateDivisor = priceContext.priceToWalletRateDivisor;
    }

    positionsByTicker.set(order.ticker, existing);
  });

  const estimatedCurrentValue = Array.from(positionsByTicker.values()).reduce(
    (sum, position) => {
      if (
        position.latestPrice === null ||
        position.priceToWalletRateDivisor === null
      ) {
        return sum;
      }

      return (
        sum +
        (position.quantity * position.latestPrice) /
          position.priceToWalletRateDivisor
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
  const instrumentPriceCurrencies = Array.from(positionsByTicker.values())
    .map((position) => position.instrumentPriceCurrency)
    .filter((value): value is string => value !== null);
  const priceToWalletRateDivisors = Array.from(positionsByTicker.values())
    .map((position) => position.priceToWalletRateDivisor)
    .filter((value): value is number => value !== null);
  const defaultInstrumentPriceUsed =
    latestPrices.length === 1 ? (latestPrices[0] ?? null) : null;
  const parsedManualPrice =
    manualPriceInput.trim() === '' ? null : Number(manualPriceInput);
  const instrumentPriceUsed =
    parsedManualPrice !== null && Number.isFinite(parsedManualPrice)
      ? parsedManualPrice
      : (defaultInstrumentPriceUsed ?? null);
  const priceToWalletRateDivisor =
    priceToWalletRateDivisors.length === 1
      ? (priceToWalletRateDivisors[0] ?? null)
      : null;
  const estimatedPositionValue =
    instrumentPriceUsed !== null && priceToWalletRateDivisor !== null
      ? (remainingQuantity * instrumentPriceUsed) / priceToWalletRateDivisor
      : estimatedCurrentValue;
  const estimatedTotal = netCashflow + estimatedPositionValue;

  return {
    walletCurrency,
    remainingQuantity,
    estimatedCurrentValue,
    estimatedTotal,
    defaultInstrumentPriceUsed,
    instrumentPriceCurrency:
      instrumentPriceCurrencies.length === 1
        ? (instrumentPriceCurrencies[0] ?? null)
        : null,
    estimatedPositionValue,
    instrumentPriceUsed,
    priceToWalletRateDivisor,
    manualPriceInput:
      manualPriceInput === '' && defaultInstrumentPriceUsed !== null
        ? String(defaultInstrumentPriceUsed)
        : manualPriceInput,
    netCashflow,
    parsedManualPrice,
  };
}

export {
  buildOrdersSummary,
  getDisplayPriceContext,
  getLatestFill,
  getOrderQuantity,
  getSignedOrderAmount,
  getWeightedDisplayedOrderPrice,
};
export type { DisplayPriceContext, OrdersSummary };
