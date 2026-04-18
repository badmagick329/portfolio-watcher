import { roundMoney } from './category-allocation-math';
import type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
} from './category-allocation-types';
import { UNCATEGORIZED_LABEL } from './category-allocation-types';

function buildCurrentCategoryAllocationViewModel({
  instruments,
}: {
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
      existing.betaWeightedValue += instrument.riskMetric.beta * snapshot.currentValue;
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

  const rows = Array.from(groups.values())
    .map(({ betaCoveredValue, betaWeightedValue, ...row }) => ({
      ...row,
      currentValue: roundMoney(row.currentValue),
      totalCost: roundMoney(row.totalCost),
      unrealizedPnl: roundMoney(row.unrealizedPnl),
      allocationPercent:
        totalCurrentValue > 0 ? row.currentValue / totalCurrentValue : 0,
      beta: betaCoveredValue > 0 ? betaWeightedValue / betaCoveredValue : null,
      betaCoveragePercent:
        row.currentValue > 0 ? betaCoveredValue / row.currentValue : null,
      returnPercent: row.totalCost > 0 ? row.unrealizedPnl / row.totalCost : null,
    }))
    .sort((left, right) => right.currentValue - left.currentValue);

  return {
    rows,
    totalCurrentValue: roundMoney(totalCurrentValue),
    totalCost: roundMoney(totalCost),
    totalPnl: roundMoney(totalPnl),
    totalReturnPercent: totalCost > 0 ? totalPnl / totalCost : null,
    portfolioBeta:
      totalBetaCoveredValue > 0 ? totalBetaValue / totalBetaCoveredValue : null,
    betaCoveragePercent:
      totalCurrentValue > 0 ? totalBetaCoveredValue / totalCurrentValue : null,
    hasCurrentHoldings: rows.length > 0,
    hasPositionSnapshots: instruments.some(
      (instrument) => instrument.currentPositionSnapshot !== null,
    ),
    hasFilteredOrders: true,
    mode: 'current',
  };
}

export { buildCurrentCategoryAllocationViewModel };
