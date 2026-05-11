import type {
  CurrentPositionSnapshot,
  EffectiveInstrumentPrice,
} from '../portfolio/instrument-price';
import type { OrdersSummary as OrdersSummaryState } from './orders-list-math';

type OrdersSummaryViewModel = {
  mode: 'single' | 'multi';
  summarySource: OrdersSummaryState['summarySource'];
  totals: {
    walletCurrency: string | null;
    remainingQuantity: number;
    lifetimePnL: number;
    estimatedPositionValue: number;
    selectedInstrumentCount: number;
  };
  priceEditor: {
    input: string;
    currency: string | null;
    canSave: boolean;
    isSaving: boolean;
    error: string | null;
    show: boolean;
  };
  effectivePrice: EffectiveInstrumentPrice | null;
  positionMetrics: {
    currentPrice: EffectiveInstrumentPrice | null;
    currentValue: number | null;
    averageCost: number | null;
    averageCostOriginal: {
      value: number;
      currency: string;
    } | null;
    costBasis: number | null;
    realizedPnL: number | null;
    unrealizedPnL: number | null;
    unrealizedPnLPercent: number | null;
    netCashflow: number;
  };
};

type OrdersSummaryActions = {
  setManualPriceInput: (value: string) => void;
  savePrice: () => void;
};

const buildOrdersSummaryViewModel = ({
  summary,
  manualPriceInput,
  canSavePrice,
  isSavingPrice,
  saveError,
  mode,
  latestPositionSnapshot,
  selectedInstrumentCount,
}: {
  summary: OrdersSummaryState;
  manualPriceInput: string;
  canSavePrice: boolean;
  isSavingPrice: boolean;
  saveError: string | null;
  mode: 'single' | 'multi';
  latestPositionSnapshot: CurrentPositionSnapshot | null;
  selectedInstrumentCount: number;
}): OrdersSummaryViewModel => ({
  mode,
  summarySource: summary.summarySource,
  totals: {
    walletCurrency: summary.walletCurrency,
    remainingQuantity: summary.remainingQuantity,
    lifetimePnL: summary.lifetimePnL,
    estimatedPositionValue: summary.estimatedPositionValue,
    selectedInstrumentCount,
  },
  priceEditor: {
    input: manualPriceInput,
    currency: summary.instrumentPriceCurrency,
    canSave: canSavePrice,
    isSaving: isSavingPrice,
    error: saveError,
    show:
      mode === 'single' &&
      summary.walletCurrency !== null &&
      summary.remainingQuantity > 0,
  },
  effectivePrice: summary.effectiveInstrumentPrice,
  positionMetrics: {
    currentPrice: mode === 'single' ? summary.currentPrice : null,
    currentValue: mode === 'single' ? summary.currentValue : null,
    averageCost: mode === 'single' ? summary.averageCost : null,
    averageCostOriginal:
      mode === 'single' &&
      summary.summarySource === 't212_position' &&
      latestPositionSnapshot?.averagePricePaid != null &&
      latestPositionSnapshot.instrumentCurrency !==
        latestPositionSnapshot.walletCurrency
        ? {
            value: latestPositionSnapshot.averagePricePaid,
            currency: latestPositionSnapshot.instrumentCurrency,
          }
        : null,
    costBasis: mode === 'single' ? summary.costBasis : null,
    realizedPnL: mode === 'single' ? summary.realizedPnL : null,
    unrealizedPnL: mode === 'single' ? summary.unrealizedPnL : null,
    unrealizedPnLPercent:
      mode === 'single' ? summary.unrealizedPnLPercent : null,
    netCashflow: summary.netCashflow,
  },
});

export {
  buildOrdersSummaryViewModel,
};
export type { OrdersSummaryActions, OrdersSummaryViewModel };
