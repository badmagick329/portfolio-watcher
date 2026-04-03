'use client';

import { saveManualInstrumentPriceAction } from '@/actions/instrument-prices-action';
import type { WebHistoricalOrder } from '@portfolio/domain';
import { useState, useTransition } from 'react';
import type {
  InstrumentStoredPrice,
  InstrumentWithStoredPrice,
} from './instrument-price';
import {
  buildMultiOrdersSummary,
  buildOrdersSummary,
  parseManualPrice,
} from './orders-list-math';
import {
  type OrdersSummaryActions,
  type OrdersSummaryViewModel,
  buildOrdersSummaryViewModel,
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
  const [manualPriceOverrideActive, setManualPriceOverrideActive] =
    useState(false);
  const [isSavingPrice, startSavingPrice] = useTransition();
  const initialSummary =
    mode === 'single'
      ? buildOrdersSummary(orders, latestStoredPrice)
      : buildMultiOrdersSummary(orders, selectedInstruments);
  const [manualPriceInput, setManualPriceInput] = useState(
    initialSummary.manualPriceInput,
  );
  const manualInputValue = manualPriceOverrideActive
    ? manualPriceInput
    : initialSummary.manualPriceInput;
  const parsedManualPrice = parseManualPrice(manualInputValue);
  const manualMatchesStoredPrice =
    manualPriceOverrideActive &&
    storedPrice !== null &&
    parsedManualPrice !== null &&
    parsedManualPrice === storedPrice.price &&
    instrumentCurrency === storedPrice.currency;
  const summary =
    mode === 'single'
      ? buildOrdersSummary(
          orders,
          storedPrice,
          manualPriceOverrideActive && !manualMatchesStoredPrice
            ? manualPriceInput
            : '',
        )
      : buildMultiOrdersSummary(orders, selectedInstruments);
  const displayedManualPriceInput = manualPriceOverrideActive
    ? manualPriceInput
    : summary.manualPriceInput;
  const parsedDisplayedManualPrice = parseManualPrice(
    displayedManualPriceInput,
  );
  const canSavePrice =
    mode === 'single' &&
    parsedDisplayedManualPrice !== null &&
    parsedDisplayedManualPrice > 0 &&
    instrumentCurrency.trim() !== '';

  const savePrice = () => {
    if (!canSavePrice || parsedDisplayedManualPrice === null) {
      return;
    }

    setSaveError(null);
    startSavingPrice(async () => {
      try {
        const savedSnapshot = await saveManualInstrumentPriceAction({
          isin: instrumentIsin,
          price: parsedDisplayedManualPrice,
          currency: instrumentCurrency,
        });

        const nextStoredPrice = {
          provider: savedSnapshot.provider,
          price: savedSnapshot.price,
          currency: savedSnapshot.currency,
          asOf: savedSnapshot.asOf,
          priceType: savedSnapshot.priceType,
        } satisfies InstrumentStoredPrice;

        setStoredPrice(nextStoredPrice);
        setManualPriceOverrideActive(false);
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
      manualPriceInput: displayedManualPriceInput,
      canSavePrice,
      isSavingPrice,
      saveError,
      mode,
      selectedInstrumentCount: selectedInstruments.length,
    }),
    actions: {
      setManualPriceInput: (value) => {
        setManualPriceInput(value);
        setManualPriceOverrideActive(true);
      },
      savePrice,
    },
  };
}

export { useOrdersSummaryController };
export type { UseOrdersSummaryControllerResult };
