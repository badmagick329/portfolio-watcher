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
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  allocationPercent: number;
  returnPercent: number | null;
  beta: number | null;
  betaCoveragePercent: number | null;
  alpha: number | null;
  buyCost?: number;
  sellProceeds?: number;
  netInvested?: number;
};

type AlphaAssumptions = {
  marketReturn: number;
  riskFreeAnnual: number;
};

type CategoryAllocationViewModel = {
  rows: CategoryAllocationRow[];
  totalCurrentValue: number;
  totalCost: number;
  totalRealizedPnl: number | null;
  totalPnl: number | null;
  totalReturnPercent: number | null;
  portfolioBeta: number | null;
  betaCoveragePercent: number | null;
  alphaAssumptions: AlphaAssumptions;
  alphaPeriodStart: string | null;
  alphaPeriodEnd: string | null;
  alphaPeriodLabel: string | null;
  portfolioAlpha: number | null;
  hasCurrentHoldings: boolean;
  hasPositionSnapshots: boolean;
  hasFilteredOrders: boolean;
  mode: 'current' | 'historical';
};

const UNCATEGORIZED_LABEL = 'Uncategorized';
const DEFAULT_ALPHA_ASSUMPTIONS: AlphaAssumptions = {
  marketReturn: 0,
  riskFreeAnnual: 0.04,
};

export { DEFAULT_ALPHA_ASSUMPTIONS, UNCATEGORIZED_LABEL };
export type {
  AlphaAssumptions,
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
};
