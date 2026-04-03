import type {
  InstrumentPriceType,
  WebHistoricalOrder,
  WebHistoricalOrderFill,
} from '@portfolio/domain';
import type {
  EffectiveInstrumentPrice,
  InstrumentStoredPrice,
  InstrumentWithStoredPrice,
} from './instrument-price';

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
  effectiveInstrumentPrice: EffectiveInstrumentPrice | null;
  fallbackInstrumentPrice: EffectiveInstrumentPrice | null;
  storedInstrumentPriceUsed: InstrumentStoredPrice | null;
  currentPrice: EffectiveInstrumentPrice | null;
  currentValue: number | null;
  averageCost: number | null;
  costBasis: number | null;
  unrealizedPnL: number | null;
  unrealizedPnLPercent: number | null;
};

type PositionCostState = {
  quantity: number;
  costBasis: number;
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

function toTimestamp(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function parseManualPrice(manualPriceInput: string) {
  if (manualPriceInput.trim() === '') {
    return null;
  }

  const value = Number(manualPriceInput);
  return Number.isFinite(value) ? value : null;
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function chooseStoredPrice({
  storedPrice,
  derivedPrice,
  derivedPriceTimestamp,
  instrumentPriceCurrency,
}: {
  storedPrice: InstrumentStoredPrice | null;
  derivedPrice: number | null;
  derivedPriceTimestamp: string | null;
  instrumentPriceCurrency: string | null;
}) {
  if (!storedPrice || derivedPrice === null || !instrumentPriceCurrency) {
    return null;
  }

  if (storedPrice.currency !== instrumentPriceCurrency) {
    return null;
  }

  const storedTimestamp = toTimestamp(storedPrice.asOf);
  const derivedTimestamp = toTimestamp(derivedPriceTimestamp);

  if (storedTimestamp === null) {
    return null;
  }

  if (derivedTimestamp !== null && storedTimestamp <= derivedTimestamp) {
    return null;
  }

  return {
    source: 'stored' as const,
    value: storedPrice.price,
    currency: storedPrice.currency,
    asOf: storedPrice.asOf,
    priceType: storedPrice.priceType,
  } satisfies EffectiveInstrumentPrice;
}

function getOrderQuantity(order: WebHistoricalOrder) {
  const quantity = order.filledQuantity ?? order.quantity;

  if (quantity === null) {
    return null;
  }

  return Math.abs(quantity);
}

function getNextPositionCostState(
  state: PositionCostState,
  order: WebHistoricalOrder,
): PositionCostState {
  const fill = getLatestFill(order);
  const quantity = getOrderQuantity(order);

  if (!fill || quantity === null || quantity === 0) {
    return state;
  }

  if (order.side === 'BUY') {
    return {
      quantity: state.quantity + quantity,
      costBasis: state.costBasis + Math.abs(fill.walletImpact.netValue),
    };
  }

  if (state.quantity === 0) {
    return state;
  }

  const averageCost = state.costBasis / state.quantity;
  const soldQuantity = Math.min(quantity, state.quantity);
  const nextQuantity = Math.max(0, state.quantity - soldQuantity);
  const nextCostBasis = Math.max(0, state.costBasis - averageCost * soldQuantity);

  return {
    quantity: roundTo(nextQuantity, 10),
    costBasis: roundTo(nextCostBasis, 10),
  };
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
  latestStoredPrice: InstrumentStoredPrice | null = null,
  manualPriceInput = '',
): OrdersSummary {
  const chronologicalOrders = [...orders].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const netCashflow = orders.reduce((sum, order) => {
    const amount = getSignedOrderAmount(order);

    return amount === null ? sum : sum + amount;
  }, 0);
  const positionCostState = chronologicalOrders.reduce(
    (state, order) => getNextPositionCostState(state, order),
    {
      quantity: 0,
      costBasis: 0,
    } satisfies PositionCostState,
  );
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
  const latestFilledAts = Array.from(positionsByTicker.values())
    .map((position) => position.latestFilledAt)
    .filter((value): value is string => value !== null);
  const latestDerivedPriceTimestamp =
    latestFilledAts.length === 1 ? (latestFilledAts[0] ?? null) : null;
  const fallbackInstrumentPrice =
    defaultInstrumentPriceUsed !== null && instrumentPriceCurrencies.length === 1
      ? chooseStoredPrice({
          storedPrice: latestStoredPrice,
          derivedPrice: defaultInstrumentPriceUsed,
          derivedPriceTimestamp: latestDerivedPriceTimestamp,
          instrumentPriceCurrency: instrumentPriceCurrencies[0] ?? null,
        }) ?? {
          source: 'derived_from_fill' as const,
          value: defaultInstrumentPriceUsed,
          currency: instrumentPriceCurrencies[0]!,
          asOf: latestDerivedPriceTimestamp ?? undefined,
          priceType: undefined as InstrumentPriceType | undefined,
        }
      : null;
  const parsedManualPrice = parseManualPrice(manualPriceInput);
  const effectiveInstrumentPrice =
    parsedManualPrice !== null && instrumentPriceCurrencies.length === 1
      ? ({
          source: 'manual',
          value: parsedManualPrice,
          currency: instrumentPriceCurrencies[0]!,
        } satisfies EffectiveInstrumentPrice)
      : fallbackInstrumentPrice;
  const instrumentPriceUsed = effectiveInstrumentPrice?.value ?? null;
  const priceToWalletRateDivisor =
    priceToWalletRateDivisors.length === 1
      ? (priceToWalletRateDivisors[0] ?? null)
      : null;
  const estimatedPositionValue =
    instrumentPriceUsed !== null && priceToWalletRateDivisor !== null
      ? (remainingQuantity * instrumentPriceUsed) / priceToWalletRateDivisor
      : estimatedCurrentValue;
  const estimatedTotal = netCashflow + estimatedPositionValue;
  const costBasis =
    remainingQuantity > 0 && positionCostState.costBasis > 0
      ? positionCostState.costBasis
      : null;
  const averageCost =
    remainingQuantity > 0 && costBasis !== null
      ? costBasis / remainingQuantity
      : null;
  const currentValue = remainingQuantity > 0 ? estimatedPositionValue : null;
  const unrealizedPnL =
    currentValue !== null && costBasis !== null ? currentValue - costBasis : null;
  const unrealizedPnLPercent =
    unrealizedPnL !== null && costBasis !== null && costBasis > 0
      ? unrealizedPnL / costBasis
      : null;

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
      manualPriceInput === '' && fallbackInstrumentPrice !== null
        ? String(fallbackInstrumentPrice.value)
        : manualPriceInput,
    netCashflow,
    parsedManualPrice,
    effectiveInstrumentPrice,
    fallbackInstrumentPrice,
    storedInstrumentPriceUsed:
      fallbackInstrumentPrice?.source === 'stored' ? latestStoredPrice : null,
    currentPrice: effectiveInstrumentPrice,
    currentValue,
    averageCost,
    costBasis,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

function buildMultiOrdersSummary(
  orders: WebHistoricalOrder[],
  selectedInstruments: InstrumentWithStoredPrice[],
): OrdersSummary {
  const instrumentSummaries = selectedInstruments.map((instrument) =>
    buildOrdersSummary(
      orders.filter((order) => order.instrument.isin === instrument.isin),
      instrument.latestStoredPrice,
      '',
    ),
  );
  const currencies = new Set(orders.map((order) => order.currency));
  const walletCurrency =
    currencies.size === 1 ? orders[0]?.currency ?? null : null;
  const netCashflow = orders.reduce((sum, order) => {
    const amount = getSignedOrderAmount(order);

    return amount === null ? sum : sum + amount;
  }, 0);
  const estimatedCurrentValue = instrumentSummaries.reduce(
    (sum, summary) => sum + summary.estimatedCurrentValue,
    0,
  );
  const estimatedPositionValue = instrumentSummaries.reduce(
    (sum, summary) => sum + summary.estimatedPositionValue,
    0,
  );

  return {
    walletCurrency,
    remainingQuantity: instrumentSummaries.reduce(
      (sum, summary) => sum + summary.remainingQuantity,
      0,
    ),
    estimatedCurrentValue,
    estimatedTotal: netCashflow + estimatedPositionValue,
    defaultInstrumentPriceUsed: null,
    instrumentPriceCurrency: null,
    estimatedPositionValue,
    instrumentPriceUsed: null,
    priceToWalletRateDivisor: null,
    manualPriceInput: '',
    netCashflow,
    parsedManualPrice: null,
    effectiveInstrumentPrice: null,
    fallbackInstrumentPrice: null,
    storedInstrumentPriceUsed: null,
    currentPrice: null,
    currentValue: null,
    averageCost: null,
    costBasis: null,
    unrealizedPnL: null,
    unrealizedPnLPercent: null,
  };
}

export {
  buildMultiOrdersSummary,
  buildOrdersSummary,
  getDisplayPriceContext,
  getLatestFill,
  getOrderQuantity,
  parseManualPrice,
  getSignedOrderAmount,
  getWeightedDisplayedOrderPrice,
};
export type { DisplayPriceContext, OrdersSummary };
