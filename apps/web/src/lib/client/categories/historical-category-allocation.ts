import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  type FillDateRangeFilter,
  filterOrdersByFilledDateRange,
} from '../portfolio/fill-date-filter';
import {
  formatShortDate,
  getAlpha,
  getPeriodRiskFreeReturn,
  roundMoney,
} from './category-allocation-math';
import type {
  AlphaAssumptions,
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
} from './category-allocation-types';
import {
  DEFAULT_ALPHA_ASSUMPTIONS,
  UNCATEGORIZED_LABEL,
} from './category-allocation-types';

function buildHistoricalCategoryAllocationViewModel({
  alphaAssumptions = DEFAULT_ALPHA_ASSUMPTIONS,
  fillDateRangeFilter,
  historicalOrders,
  instruments,
}: {
  alphaAssumptions?: AlphaAssumptions;
  fillDateRangeFilter: FillDateRangeFilter;
  historicalOrders: WebHistoricalOrder[];
  instruments: CategorizedInstrumentWithPosition[];
}): CategoryAllocationViewModel {
  const filteredOrders = filterOrdersByFilledDateRange(
    historicalOrders,
    fillDateRangeFilter,
  );
  const instrumentsByIsin = new Map(
    instruments.map((instrument) => [instrument.isin, instrument]),
  );
  const groups = new Map<
    string,
    CategoryAllocationRow & {
      buyCost: number;
      betaCoveredBuyCost: number;
      betaWeightedBuyCost: number;
      holdingIsins: Set<string>;
      remainingValue: number;
      sellProceeds: number;
    }
  >();
  const positionsByIsin = new Map<
    string,
    {
      category: string;
      instrument: CategorizedInstrumentWithPosition | undefined;
      latestOrder: WebHistoricalOrder;
      quantity: number;
    }
  >();

  filteredOrders.forEach((order) => {
    const instrument = instrumentsByIsin.get(order.instrument.isin);
    const category = instrument?.category || UNCATEGORIZED_LABEL;
    const existing =
      groups.get(category) ??
      ({
        category,
        holdingCount: 0,
        currentValue: 0,
        totalCost: 0,
        unrealizedPnl: 0,
        allocationPercent: 0,
        beta: null,
        betaCoveragePercent: null,
        alpha: null,
        buyCost: 0,
        betaCoveredBuyCost: 0,
        betaWeightedBuyCost: 0,
        netInvested: 0,
        returnPercent: null,
        sellProceeds: 0,
        holdingIsins: new Set<string>(),
        remainingValue: 0,
      } satisfies CategoryAllocationRow & {
        buyCost: number;
        betaCoveredBuyCost: number;
        betaWeightedBuyCost: number;
        holdingIsins: Set<string>;
        remainingValue: number;
        sellProceeds: number;
      });
    const quantity = getOrderQuantity(order);
    const orderValue = getOrderWalletValue(order);
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;

    if (order.side === 'BUY') {
      existing.buyCost += orderValue;
      if (instrument?.riskMetric) {
        existing.betaCoveredBuyCost += orderValue;
        existing.betaWeightedBuyCost += instrument.riskMetric.beta * orderValue;
      }
    } else {
      existing.sellProceeds += orderValue;
    }

    existing.holdingIsins.add(order.instrument.isin);
    const position = positionsByIsin.get(order.instrument.isin) ?? {
      category,
      instrument,
      latestOrder: order,
      quantity: 0,
    };

    position.quantity += signedQuantity;

    if (getLatestFillTime(order) > getLatestFillTime(position.latestOrder)) {
      position.latestOrder = order;
    }

    positionsByIsin.set(order.instrument.isin, position);

    groups.set(category, existing);
  });

  positionsByIsin.forEach((position) => {
    if (position.quantity <= 0) {
      return;
    }

    const group = groups.get(position.category);

    if (!group) {
      return;
    }

    group.remainingValue += estimateRemainingValue({
      instrument: position.instrument,
      order: position.latestOrder,
      signedQuantity: position.quantity,
    });
  });

  const totalNetInvested = Array.from(groups.values()).reduce(
    (sum, row) => sum + (row.buyCost - row.sellProceeds),
    0,
  );
  const alphaPeriod = getHistoricalAlphaPeriod({
    fillDateRangeFilter,
    filteredOrders,
  });
  const periodRiskFreeReturn =
    alphaPeriod === null
      ? null
      : getPeriodRiskFreeReturn({
          days: alphaPeriod.days,
          riskFreeAnnual: alphaAssumptions.riskFreeAnnual,
        });

  const rows = Array.from(groups.values())
    .map(
      ({
        betaCoveredBuyCost,
        betaWeightedBuyCost,
        holdingIsins,
        remainingValue,
        ...row
      }) => {
        const buyCost = roundMoney(row.buyCost);
        const sellProceeds = roundMoney(row.sellProceeds);
        const netInvested = roundMoney(row.buyCost - row.sellProceeds);
        const beta =
          betaCoveredBuyCost > 0
            ? betaWeightedBuyCost / betaCoveredBuyCost
            : null;
        const pnl =
          row.buyCost > 0
            ? roundMoney(row.sellProceeds + remainingValue - row.buyCost)
            : null;
        const returnPercent =
          row.buyCost > 0 && pnl !== null ? pnl / row.buyCost : null;

        return {
          ...row,
          buyCost,
          holdingCount: holdingIsins.size,
          currentValue: netInvested,
          netInvested,
          sellProceeds,
          totalCost: buyCost,
          unrealizedPnl: pnl,
          allocationPercent: 0,
          beta,
          betaCoveragePercent:
            row.buyCost > 0 ? betaCoveredBuyCost / row.buyCost : null,
          returnPercent,
          alpha: getAlpha({
            beta,
            marketReturn: alphaAssumptions.marketReturn,
            periodRiskFreeReturn,
            returnPercent,
          }),
        };
      },
    )
    .filter((row) => row.buyCost > 0 || row.sellProceeds > 0)
    .sort(
      (left, right) =>
        Math.abs(right.netInvested ?? 0) - Math.abs(left.netInvested ?? 0),
    );
  const totalCost = rows.reduce((sum, row) => sum + (row.buyCost ?? 0), 0);
  const totalPnl = rows.reduce((sum, row) => sum + (row.unrealizedPnl ?? 0), 0);
  const hasPnl = rows.some((row) => row.unrealizedPnl !== null);
  const totalBetaCoveredBuyCost = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.betaCoveredBuyCost,
    0,
  );
  const totalBetaWeightedBuyCost = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.betaWeightedBuyCost,
    0,
  );
  const portfolioBeta =
    totalBetaCoveredBuyCost > 0
      ? totalBetaWeightedBuyCost / totalBetaCoveredBuyCost
      : null;
  const totalReturnPercent =
    totalCost > 0 && hasPnl ? totalPnl / totalCost : null;

  return {
    rows,
    totalCurrentValue: roundMoney(totalNetInvested),
    totalCost: roundMoney(totalCost),
    totalPnl: hasPnl ? roundMoney(totalPnl) : null,
    totalReturnPercent,
    portfolioBeta,
    betaCoveragePercent:
      totalCost > 0 ? totalBetaCoveredBuyCost / totalCost : null,
    alphaAssumptions,
    alphaPeriodStart: alphaPeriod?.start ?? null,
    alphaPeriodEnd: alphaPeriod?.end ?? null,
    alphaPeriodLabel:
      alphaPeriod === null
        ? null
        : `${formatShortDate(alphaPeriod.start)} - ${formatShortDate(
            alphaPeriod.end,
          )}`,
    portfolioAlpha: getAlpha({
      beta: portfolioBeta,
      marketReturn: alphaAssumptions.marketReturn,
      periodRiskFreeReturn,
      returnPercent: totalReturnPercent,
    }),
    hasCurrentHoldings: rows.length > 0,
    hasPositionSnapshots: true,
    hasFilteredOrders: filteredOrders.length > 0,
    mode: 'historical',
  };
}

const getHistoricalAlphaPeriod = ({
  fillDateRangeFilter,
  filteredOrders,
}: {
  fillDateRangeFilter: FillDateRangeFilter;
  filteredOrders: WebHistoricalOrder[];
}) => {
  const fillTimes = filteredOrders
    .flatMap((order) => order.fills.map((fill) => fill.filledAt))
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort();
  const inferredStart = fillTimes[0];
  const inferredEnd = fillTimes.at(-1);
  const start = fillDateRangeFilter.filledFrom
    ? `${fillDateRangeFilter.filledFrom}T00:00:00.000Z`
    : inferredStart;
  const end = fillDateRangeFilter.filledTo
    ? `${fillDateRangeFilter.filledTo}T23:59:59.999Z`
    : inferredEnd;

  if (!start || !end) {
    return null;
  }

  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;

  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  return { days, end, start };
};

const getOrderQuantity = (order: WebHistoricalOrder) => {
  if (order.fills.length > 0) {
    return order.fills.reduce((sum, fill) => sum + Math.abs(fill.quantity), 0);
  }

  const quantity = order.filledQuantity ?? order.quantity;
  return quantity === null ? 0 : Math.abs(quantity);
};

const getOrderWalletValue = (order: WebHistoricalOrder) => {
  if (order.fills.length > 0) {
    return order.fills.reduce(
      (sum, fill) => sum + Math.abs(fill.walletImpact.netValue),
      0,
    );
  }

  const value = order.filledValue ?? order.value;
  return value === null ? 0 : Math.abs(value);
};

const getLatestFillTime = (order: WebHistoricalOrder) =>
  order.fills.reduce(
    (latest, fill) => (fill.filledAt > latest ? fill.filledAt : latest),
    '',
  );

const estimateRemainingValue = ({
  instrument,
  order,
  signedQuantity,
}: {
  instrument: CategorizedInstrumentWithPosition | undefined;
  order: WebHistoricalOrder;
  signedQuantity: number;
}) => {
  if (signedQuantity <= 0) {
    return 0;
  }

  const snapshot = instrument?.currentPositionSnapshot;

  if (snapshot && snapshot.quantity > 0) {
    return signedQuantity * (snapshot.currentValue / snapshot.quantity);
  }

  const latestFill = order.fills
    .slice()
    .sort((left, right) => right.filledAt.localeCompare(left.filledAt))[0];

  if (!latestFill || latestFill.walletImpact.fxRate === 0) {
    return 0;
  }

  return (signedQuantity * latestFill.price) / latestFill.walletImpact.fxRate;
};

export { buildHistoricalCategoryAllocationViewModel };
