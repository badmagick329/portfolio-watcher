'use client';

import type { WebHistoricalOrder } from '@portfolio/domain';
import { useEffect, useState } from 'react';
import type {
  AccountSummarySnapshot,
  InstrumentStoredPrice,
  InstrumentWithStoredPrice,
} from '../portfolio/instrument-price';
import { useSaveManualInstrumentPriceMutation } from '../portfolio/useSaveManualInstrumentPriceMutation';
import {
  buildAllInstrumentsSummaryFromAccountSummary,
  buildMultiOrdersSummaryFromCurrentPositions,
  buildMultiOrdersSummary,
  buildOrdersSummaryFromCurrentPosition,
  buildOrdersSummary,
  parseManualPrice,
} from './orders-list-math';
import {
  type OrdersSummaryActions,
  type OrdersSummaryViewModel,
  buildOrdersSummaryViewModel,
} from './orders-summary-view-model';

type UseOrdersSummaryControllerParams = {
  hasActiveFillDateFilter: boolean;
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
  selectionMode: 'all' | 'single' | 'include' | 'exclude';
  selectedInstruments: InstrumentWithStoredPrice[];
};

type UseOrdersSummaryControllerResult = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function useOrdersSummaryController({
  hasActiveFillDateFilter,
  latestAccountSummarySnapshot,
  orders,
  selectionMode,
  selectedInstruments,
}: UseOrdersSummaryControllerParams): UseOrdersSummaryControllerResult {
  const singleSelectedInstrument =
    selectedInstruments.length === 1 ? (selectedInstruments[0] ?? null) : null;
  const latestStoredPrice = singleSelectedInstrument?.latestStoredPrice ?? null;
  const instrumentIsin = singleSelectedInstrument?.isin ?? '';
  const instrumentCurrency = singleSelectedInstrument?.currency ?? '';
  const latestPositionSnapshot =
    singleSelectedInstrument?.latestPositionSnapshot ?? null;
  const mode = singleSelectedInstrument ? 'single' : 'multi';
  const [storedPrice, setStoredPrice] = useState(latestStoredPrice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [manualPriceOverrideActive, setManualPriceOverrideActive] =
    useState(false);
  const saveManualInstrumentPriceMutation = useSaveManualInstrumentPriceMutation();
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
    !hasActiveFillDateFilter &&
    selectionMode === 'all' &&
    latestAccountSummarySnapshot !== null
      ? buildAllInstrumentsSummaryFromAccountSummary(
          latestAccountSummarySnapshot,
          selectedInstruments.length,
        )
      : mode === 'single'
        ? latestPositionSnapshot !== null && !hasActiveFillDateFilter
          ? buildOrdersSummaryFromCurrentPosition(
              orders,
              storedPrice,
              latestPositionSnapshot,
              manualPriceOverrideActive && !manualMatchesStoredPrice
                ? manualPriceInput
                : '',
            )
          : buildOrdersSummary(
              orders,
              storedPrice,
              manualPriceOverrideActive && !manualMatchesStoredPrice
                ? manualPriceInput
                : '',
            )
        : !hasActiveFillDateFilter
          ? buildMultiOrdersSummaryFromCurrentPositions({
              orders,
              selectedInstruments,
            })
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

  useEffect(() => {
    setStoredPrice(latestStoredPrice);
  }, [latestStoredPrice]);

  const savePrice = () => {
    if (!canSavePrice || parsedDisplayedManualPrice === null) {
      return;
    }

    setSaveError(null);
    void saveManualInstrumentPriceMutation
      .mutateAsync({
        isin: instrumentIsin,
        price: parsedDisplayedManualPrice,
        currency: instrumentCurrency,
      })
      .then((savedSnapshot) => {
        const nextStoredPrice = {
          provider: savedSnapshot.provider,
          price: savedSnapshot.price,
          currency: savedSnapshot.currency,
          asOf: savedSnapshot.asOf,
          priceType: savedSnapshot.priceType,
        } satisfies InstrumentStoredPrice;

        setStoredPrice(nextStoredPrice);
        setManualPriceOverrideActive(false);
      })
      .catch((error) => {
        setSaveError(
          error instanceof Error ? error.message : 'Failed to save price.',
        );
      });
  };

  return {
    viewModel: buildOrdersSummaryViewModel({
      summary,
      manualPriceInput: displayedManualPriceInput,
      canSavePrice,
      isSavingPrice: saveManualInstrumentPriceMutation.isPending,
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
