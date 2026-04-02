'use client';

import { useState, useTransition } from 'react';
import { saveManualInstrumentPriceAction } from '@/actions/instrument-prices-action';
import type { WebHistoricalOrder } from '@portfolio/domain';
import type { InstrumentStoredPrice } from './instrument-price';
import { buildOrdersSummary } from './orders-list-math';
import {
  buildOrdersSummaryViewModel,
  type OrdersSummaryActions,
  type OrdersSummaryViewModel,
} from './orders-summary-view-model';

type UseOrdersSummaryControllerParams = {
  orders: WebHistoricalOrder[];
  latestStoredPrice: InstrumentStoredPrice | null;
  instrumentIsin: string;
  instrumentCurrency: string;
  onStoredPriceSaved: (latestStoredPrice: InstrumentStoredPrice) => void;
};

type UseOrdersSummaryControllerResult = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function useOrdersSummaryController({
  orders,
  latestStoredPrice,
  instrumentIsin,
  instrumentCurrency,
  onStoredPriceSaved,
}: UseOrdersSummaryControllerParams): UseOrdersSummaryControllerResult {
  const [storedPrice, setStoredPrice] = useState(latestStoredPrice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingPrice, startSavingPrice] = useTransition();
  const initialSummary = buildOrdersSummary(orders, storedPrice);
  const [manualPriceInput, setManualPriceInput] = useState(
    initialSummary.manualPriceInput,
  );
  const summary = buildOrdersSummary(orders, storedPrice, manualPriceInput);
  const parsedManualPrice = summary.parsedManualPrice;
  const canSavePrice =
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
        onStoredPriceSaved(nextStoredPrice);
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
    }),
    actions: {
      setManualPriceInput,
      savePrice,
    },
  };
}

export { useOrdersSummaryController };
export type { UseOrdersSummaryControllerResult };
