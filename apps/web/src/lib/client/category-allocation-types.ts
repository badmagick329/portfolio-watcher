import type {
  CategorizedInstrument,
  CurrentPositionSnapshot,
  InstrumentRiskMetricSnapshot,
} from '@portfolio/domain';

type CategorizedInstrumentWithPosition = CategorizedInstrument & {
  currentPositionSnapshot: CurrentPositionSnapshot | null;
  riskMetric?: InstrumentRiskMetricSnapshot | null;
};

type CategoryAllocationRow = {
  category: string;
  holdingCount: number;
  currentValue: number;
  totalCost: number;
  unrealizedPnl: number | null;
  allocationPercent: number;
  returnPercent: number | null;
  beta: number | null;
  betaCoveragePercent: number | null;
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
  portfolioBeta: number | null;
  betaCoveragePercent: number | null;
  hasCurrentHoldings: boolean;
  hasPositionSnapshots: boolean;
  hasFilteredOrders: boolean;
  mode: 'current' | 'historical';
};

const UNCATEGORIZED_LABEL = 'Uncategorized';

export { UNCATEGORIZED_LABEL };
export type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
};
