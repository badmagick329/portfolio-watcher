import type {
  CategorizedInstrument,
  CurrentPositionSnapshot,
} from '@portfolio/domain';

type CategorizedInstrumentWithPosition = CategorizedInstrument & {
  currentPositionSnapshot: CurrentPositionSnapshot | null;
};

type CategoryAllocationRow = {
  category: string;
  holdingCount: number;
  currentValue: number;
  totalCost: number;
  unrealizedPnl: number;
  allocationPercent: number;
  returnPercent: number | null;
};

type CategoryAllocationViewModel = {
  rows: CategoryAllocationRow[];
  totalCurrentValue: number;
  hasCurrentHoldings: boolean;
  hasPositionSnapshots: boolean;
};

const UNCATEGORIZED_LABEL = 'Uncategorized';

function buildCategoryAllocationViewModel(
  instruments: CategorizedInstrumentWithPosition[],
): CategoryAllocationViewModel {
  const groups = new Map<string, CategoryAllocationRow>();

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
        returnPercent: null,
      } satisfies CategoryAllocationRow);

    existing.holdingCount += 1;
    existing.currentValue += snapshot.currentValue;
    existing.totalCost += snapshot.totalCost;
    existing.unrealizedPnl += snapshot.unrealizedProfitLoss;
    groups.set(category, existing);
  });

  const totalCurrentValue = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.currentValue,
    0,
  );

  const rows = Array.from(groups.values())
    .map((row) => ({
      ...row,
      currentValue: roundMoney(row.currentValue),
      totalCost: roundMoney(row.totalCost),
      unrealizedPnl: roundMoney(row.unrealizedPnl),
      allocationPercent:
        totalCurrentValue > 0 ? row.currentValue / totalCurrentValue : 0,
      returnPercent: row.totalCost > 0 ? row.unrealizedPnl / row.totalCost : null,
    }))
    .sort((left, right) => right.currentValue - left.currentValue);

  return {
    rows,
    totalCurrentValue: roundMoney(totalCurrentValue),
    hasCurrentHoldings: rows.length > 0,
    hasPositionSnapshots: instruments.some(
      (instrument) => instrument.currentPositionSnapshot !== null,
    ),
  };
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export { buildCategoryAllocationViewModel, UNCATEGORIZED_LABEL };
export type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
};
