import type {
  CategorizedInstrument,
  CurrentPositionSnapshot,
  WebHistoricalOrder,
} from '@portfolio/domain';
import {
  filterOrdersByFilledDateRange,
  hasFillDateRangeFilter,
  type FillDateRangeFilter,
} from './fill-date-filter';

type CategorizedInstrumentWithPosition = CategorizedInstrument & {
  currentPositionSnapshot: CurrentPositionSnapshot | null;
};

type CategoryAllocationRow = {
  category: string;
  holdingCount: number;
  currentValue: number;
  totalCost: number;
  unrealizedPnl: number | null;
  allocationPercent: number;
  returnPercent: number | null;
  buyCost?: number;
  sellProceeds?: number;
  netInvested?: number;
};

type CategoryAllocationViewModel = {
  rows: CategoryAllocationRow[];
  totalCurrentValue: number;
  totalCost: number;
  totalPnl: number | null;
  totalReturnPercent: number | null;
  hasCurrentHoldings: boolean;
  hasPositionSnapshots: boolean;
  hasFilteredOrders: boolean;
  mode: 'current' | 'historical';
};

const UNCATEGORIZED_LABEL = 'Uncategorized';

function buildCategoryAllocationViewModel({
  fillDateRangeFilter = {},
  historicalOrders = [],
  instruments,
}: {
  fillDateRangeFilter?: FillDateRangeFilter;
  historicalOrders?: WebHistoricalOrder[];
  instruments: CategorizedInstrumentWithPosition[];
}): CategoryAllocationViewModel {
  if (hasFillDateRangeFilter(fillDateRangeFilter)) {
    return buildHistoricalCategoryAllocationViewModel({
      fillDateRangeFilter,
      historicalOrders,
      instruments,
    });
  }

  const groups = new Map<string, CategoryAllocationRow & { unrealizedPnl: number }>();

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
      } satisfies CategoryAllocationRow & { unrealizedPnl: number });

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
  const totalCost = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.totalCost,
    0,
  );
  const totalPnl = Array.from(groups.values()).reduce(
    (sum, row) => sum + row.unrealizedPnl,
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
    totalCost: roundMoney(totalCost),
    totalPnl: roundMoney(totalPnl),
    totalReturnPercent: totalCost > 0 ? totalPnl / totalCost : null,
    hasCurrentHoldings: rows.length > 0,
    hasPositionSnapshots: instruments.some(
      (instrument) => instrument.currentPositionSnapshot !== null,
    ),
    hasFilteredOrders: true,
    mode: 'current',
  };
}

function buildHistoricalCategoryAllocationViewModel({
  fillDateRangeFilter,
  historicalOrders,
  instruments,
}: {
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
        buyCost: 0,
        netInvested: 0,
        returnPercent: null,
        sellProceeds: 0,
        holdingIsins: new Set<string>(),
        remainingValue: 0,
      } satisfies CategoryAllocationRow & {
        buyCost: number;
        holdingIsins: Set<string>;
        remainingValue: number;
        sellProceeds: number;
      });
    const quantity = getOrderQuantity(order);
    const orderValue = getOrderWalletValue(order);
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;

    if (order.side === 'BUY') {
      existing.buyCost += orderValue;
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

  const rows = Array.from(groups.values())
    .map(({ holdingIsins, remainingValue, ...row }) => {
      const buyCost = roundMoney(row.buyCost);
      const sellProceeds = roundMoney(row.sellProceeds);
      const netInvested = roundMoney(row.buyCost - row.sellProceeds);
      const pnl =
        row.buyCost > 0
          ? roundMoney(row.sellProceeds + remainingValue - row.buyCost)
          : null;

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
        returnPercent:
          row.buyCost > 0 && pnl !== null ? pnl / row.buyCost : null,
      };
    })
    .filter((row) => row.buyCost > 0 || row.sellProceeds > 0)
    .sort(
      (left, right) =>
        Math.abs(right.netInvested ?? 0) - Math.abs(left.netInvested ?? 0),
    );
  const totalCost = rows.reduce((sum, row) => sum + (row.buyCost ?? 0), 0);
  const totalPnl = rows.reduce(
    (sum, row) => sum + (row.unrealizedPnl ?? 0),
    0,
  );
  const hasPnl = rows.some((row) => row.unrealizedPnl !== null);

  return {
    rows,
    totalCurrentValue: roundMoney(totalNetInvested),
    totalCost: roundMoney(totalCost),
    totalPnl: hasPnl ? roundMoney(totalPnl) : null,
    totalReturnPercent:
      totalCost > 0 && hasPnl ? totalPnl / totalCost : null,
    hasCurrentHoldings: rows.length > 0,
    hasPositionSnapshots: true,
    hasFilteredOrders: filteredOrders.length > 0,
    mode: 'historical',
  };
}

const getOrderQuantity = (order: WebHistoricalOrder) => {
  if (order.fills.length > 0) {
    return order.fills.reduce(
      (sum, fill) => sum + Math.abs(fill.quantity),
      0,
    );
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

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export { buildCategoryAllocationViewModel, UNCATEGORIZED_LABEL };
export type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
};
