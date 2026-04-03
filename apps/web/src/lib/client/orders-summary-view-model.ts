import type { EffectiveInstrumentPrice } from './instrument-price';
import type { OrdersSummary as OrdersSummaryState } from './orders-list-math';

type OrdersSummaryViewModel = {
  mode: 'single' | 'multi';
  totals: {
    walletCurrency: string | null;
    remainingQuantity: number;
    estimatedTotal: number;
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
  selectedInstrumentCount,
}: {
  summary: OrdersSummaryState;
  manualPriceInput: string;
  canSavePrice: boolean;
  isSavingPrice: boolean;
  saveError: string | null;
  mode: 'single' | 'multi';
  selectedInstrumentCount: number;
}): OrdersSummaryViewModel => ({
  mode,
  totals: {
    walletCurrency: summary.walletCurrency,
    remainingQuantity: summary.remainingQuantity,
    estimatedTotal: summary.estimatedTotal,
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
});

export {
  buildOrdersSummaryViewModel,
};
export type { OrdersSummaryActions, OrdersSummaryViewModel };
