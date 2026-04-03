'use client';

import { useState, useTransition } from 'react';
import { saveManualInstrumentPriceAction } from '@/actions/instrument-prices-action';
import type { WebHistoricalOrder } from '@portfolio/domain';
import type { InstrumentStoredPrice, InstrumentWithStoredPrice } from './instrument-price';
import { buildMultiOrdersSummary, buildOrdersSummary } from './orders-list-math';
import {
  buildOrdersSummaryViewModel,
  type OrdersSummaryActions,
  type OrdersSummaryViewModel,
} from './orders-summary-view-model';

type UseOrdersSummaryControllerParams = {
  orders: WebHistoricalOrder[];
  selectedInstruments: InstrumentWithStoredPrice[];
  onStoredPriceSaved: (
    isin: string,
    latestStoredPrice: InstrumentStoredPrice,
  ) => void;
};

type UseOrdersSummaryControllerResult = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function useOrdersSummaryController({
  orders,
  selectedInstruments,
  onStoredPriceSaved,
}: UseOrdersSummaryControllerParams): UseOrdersSummaryControllerResult {
  const singleSelectedInstrument =
    selectedInstruments.length === 1 ? (selectedInstruments[0] ?? null) : null;
  const latestStoredPrice = singleSelectedInstrument?.latestStoredPrice ?? null;
  const instrumentIsin = singleSelectedInstrument?.isin ?? '';
  const instrumentCurrency = singleSelectedInstrument?.currency ?? '';
  const mode = singleSelectedInstrument ? 'single' : 'multi';
  const [storedPrice, setStoredPrice] = useState(latestStoredPrice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingPrice, startSavingPrice] = useTransition();
  const initialSummary =
    mode === 'single'
      ? buildOrdersSummary(orders, latestStoredPrice)
      : buildMultiOrdersSummary(orders, selectedInstruments);
  const [manualPriceInput, setManualPriceInput] = useState(
    initialSummary.manualPriceInput,
  );
  const summary =
    mode === 'single'
      ? buildOrdersSummary(orders, storedPrice, manualPriceInput)
      : buildMultiOrdersSummary(orders, selectedInstruments);
  const parsedManualPrice = summary.parsedManualPrice;
  const canSavePrice =
    mode === 'single' &&
    parsedManualPrice !== null &&
    parsedManualPrice > 0 &&
    instrumentCurrency.trim() !== '';

  const savePrice = () => {
    if (!canSavePrice || parsedManualPrice === null) {
      return;
    }

    setSaveError(null);
    startSavingPrice(async () => {
      try {
        const savedSnapshot = await saveManualInstrumentPriceAction({
          isin: instrumentIsin,
          price: parsedManualPrice,
          currency: instrumentCurrency,
        });

        const nextStoredPrice = {
          price: savedSnapshot.price,
          currency: savedSnapshot.currency,
          asOf: savedSnapshot.asOf,
          priceType: savedSnapshot.priceType,
        } satisfies InstrumentStoredPrice;

        setStoredPrice(nextStoredPrice);
        onStoredPriceSaved(instrumentIsin, nextStoredPrice);
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : 'Failed to save price.',
        );
      }
    });
  };

  return {
    viewModel: buildOrdersSummaryViewModel({
      summary,
      manualPriceInput,
      canSavePrice,
      isSavingPrice,
      saveError,
      mode,
      selectedInstrumentCount: selectedInstruments.length,
    }),
    actions: {
      setManualPriceInput,
      savePrice,
    },
  };
}

export { useOrdersSummaryController };
export type { UseOrdersSummaryControllerResult };
