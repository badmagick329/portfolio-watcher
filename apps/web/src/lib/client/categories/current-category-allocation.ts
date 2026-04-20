import type { WebHistoricalOrder } from '@portfolio/domain';
import { roundMoney } from './category-allocation-math';
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

function buildCurrentCategoryAllocationViewModel({
  alphaAssumptions = DEFAULT_ALPHA_ASSUMPTIONS,
  historicalOrders = [],
  instruments,
}: {
  alphaAssumptions?: AlphaAssumptions;
  historicalOrders?: WebHistoricalOrder[];
  instruments: CategorizedInstrumentWithPosition[];
}): CategoryAllocationViewModel {
  const groups = new Map<
    string,
    CategoryAllocationRow & {
      betaCoveredValue: number;
      betaWeightedValue: number;
      unrealizedPnl: number;
    }
  >();

  instruments.forEach((instrument) => {
    const snapshot = instrument.currentPositionSnapshot;

    if (!snapshot) {
      return;
    }

    if (snapshot.quantity <= 0) {
      return;
    }

    const category = instrument.category || UNCATEGORIZED_LABEL;
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
        betaCoveredValue: 0,
        betaWeightedValue: 0,
        returnPercent: null,
      } satisfies CategoryAllocationRow & {
        betaCoveredValue: number;
        betaWeightedValue: number;
        unrealizedPnl: number;
      });

    existing.holdingCount += 1;
    existing.currentValue += snapshot.currentValue;
    existing.totalCost += snapshot.totalCost;
    existing.unrealizedPnl += snapshot.unrealizedProfitLoss;
    if (instrument.riskMetric) {
      existing.betaCoveredValue += snapshot.currentValue;
      existing.betaWeightedValue +=
        instrument.riskMetric.beta * snapshot.currentValue;
      existing.beta =
        existing.betaCoveredValue > 0
          ? existing.betaWeightedValue / existing.betaCoveredValue
          : null;
    }
    groups.set(category, existing);
  });

  const totalCurrentValue = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.currentValue,
    0,
  );
  const totalCost = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.totalCost,
    0,
  );
  const totalPnl = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.unrealizedPnl,
    0,
  );
  const totalBetaValue = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.betaWeightedValue,
    0,
  );
  const totalBetaCoveredValue = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.betaCoveredValue,
    0,
  );
  const alphaPeriod = getCurrentAlphaPeriod({
    historicalOrders,
    instruments,
  });
  const periodRiskFreeReturn =
    alphaPeriod === null
      ? null
      : getPeriodRiskFreeReturn({
          days: alphaPeriod.days,
          riskFreeAnnual: alphaAssumptions.riskFreeAnnual,
        });

  const rows = Array.from(groups.values())
    .map(({ betaCoveredValue, betaWeightedValue, ...row }) => {
      const beta =
        betaCoveredValue > 0 ? betaWeightedValue / betaCoveredValue : null;
      const returnPercent =
        row.totalCost > 0 ? row.unrealizedPnl / row.totalCost : null;

      return {
        ...row,
        currentValue: roundMoney(row.currentValue),
        totalCost: roundMoney(row.totalCost),
        unrealizedPnl: roundMoney(row.unrealizedPnl),
        allocationPercent:
          totalCurrentValue > 0 ? row.currentValue / totalCurrentValue : 0,
        beta,
        betaCoveragePercent:
          row.currentValue > 0 ? betaCoveredValue / row.currentValue : null,
        returnPercent,
        alpha: getAlpha({
          beta,
          marketReturn: alphaAssumptions.marketReturn,
          periodRiskFreeReturn,
          returnPercent,
        }),
      };
    })
    .sort((left, right) => right.currentValue - left.currentValue);
  const portfolioBeta =
    totalBetaCoveredValue > 0 ? totalBetaValue / totalBetaCoveredValue : null;
  const totalReturnPercent = totalCost > 0 ? totalPnl / totalCost : null;

  return {
    rows,
    totalCurrentValue: roundMoney(totalCurrentValue),
    totalCost: roundMoney(totalCost),
    totalPnl: roundMoney(totalPnl),
    totalReturnPercent,
    portfolioBeta,
    betaCoveragePercent:
      totalCurrentValue > 0 ? totalBetaCoveredValue / totalCurrentValue : null,
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
    hasPositionSnapshots: instruments.some(
      (instrument) => instrument.currentPositionSnapshot !== null,
    ),
    hasFilteredOrders: true,
    mode: 'current',
  };
}

const getCurrentAlphaPeriod = ({
  historicalOrders,
  instruments,
}: {
  historicalOrders: WebHistoricalOrder[];
  instruments: CategorizedInstrumentWithPosition[];
}) => {
  const currentHoldingIsins = new Set(
    instruments
      .filter(
        (instrument) =>
          instrument.currentPositionSnapshot &&
          instrument.currentPositionSnapshot.quantity > 0,
      )
      .map((instrument) => instrument.isin),
  );

  if (currentHoldingIsins.size === 0) {
    return null;
  }

  const start = historicalOrders
    .filter((order) => currentHoldingIsins.has(order.instrument.isin))
    .flatMap((order) => order.fills.map((fill) => fill.filledAt))
    .sort()[0];
  const end = instruments
    .filter((instrument) => currentHoldingIsins.has(instrument.isin))
    .map((instrument) => instrument.currentPositionSnapshot?.asOf)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  if (!start || !end || start >= end) {
    return null;
  }

  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;

  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  return { days, end, start };
};

const getPeriodRiskFreeReturn = ({
  days,
  riskFreeAnnual,
}: {
  days: number;
  riskFreeAnnual: number;
}) => {
  if (!Number.isFinite(riskFreeAnnual) || riskFreeAnnual <= -1) {
    return null;
  }

  return (1 + riskFreeAnnual) ** (days / 365) - 1;
};

const getAlpha = ({
  beta,
  marketReturn,
  periodRiskFreeReturn,
  returnPercent,
}: {
  beta: number | null;
  marketReturn: number;
  periodRiskFreeReturn: number | null;
  returnPercent: number | null;
}) => {
  if (
    beta === null ||
    returnPercent === null ||
    periodRiskFreeReturn === null ||
    !Number.isFinite(marketReturn)
  ) {
    return null;
  }

  return (
    returnPercent -
    (periodRiskFreeReturn + beta * (marketReturn - periodRiskFreeReturn))
  );
};

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export { buildCurrentCategoryAllocationViewModel };
