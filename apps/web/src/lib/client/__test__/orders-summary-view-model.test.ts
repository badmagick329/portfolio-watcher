import { describe, expect, test } from 'vitest';
import { buildOrdersSummaryViewModel } from '../orders-summary-view-model';
import type { OrdersSummary } from '../orders-list-math';

const baseSummary: OrdersSummary = {
  walletCurrency: 'USD',
  remainingQuantity: 10,
  estimatedCurrentValue: 1000,
  estimatedTotal: 1200,
  defaultInstrumentPriceUsed: 100,
  instrumentPriceCurrency: 'USD',
  estimatedPositionValue: 1000,
  instrumentPriceUsed: 100,
  priceToWalletRateDivisor: 1,
  manualPriceInput: '100',
  netCashflow: 200,
  parsedManualPrice: 100,
  effectiveInstrumentPrice: {
    source: 'manual',
    value: 100,
    currency: 'USD',
  },
  fallbackInstrumentPrice: {
    source: 'stored',
    value: 95,
    currency: 'USD',
    asOf: '2026-04-02T10:15:00.000Z',
    priceType: 'manual',
  },
  storedInstrumentPriceUsed: {
    price: 95,
    currency: 'USD',
    asOf: '2026-04-02T10:15:00.000Z',
    priceType: 'manual',
  },
};

describe('buildOrdersSummaryViewModel', () => {
  test('groups totals, price editor state, and effective price', () => {
    const viewModel = buildOrdersSummaryViewModel({
      summary: baseSummary,
      manualPriceInput: '101',
      canSavePrice: true,
      isSavingPrice: false,
      saveError: null,
      mode: 'single',
      selectedInstrumentCount: 1,
    });

    expect(viewModel).toEqual({
      mode: 'single',
      totals: {
        walletCurrency: 'USD',
        remainingQuantity: 10,
        estimatedTotal: 1200,
        estimatedPositionValue: 1000,
        selectedInstrumentCount: 1,
      },
      priceEditor: {
        input: '101',
        currency: 'USD',
        canSave: true,
        isSaving: false,
        error: null,
        show: true,
      },
      effectivePrice: {
        source: 'manual',
        value: 100,
        currency: 'USD',
      },
    });
  });

  test('hides the price editor when there is no single-currency holding', () => {
    const viewModel = buildOrdersSummaryViewModel({
      summary: {
        ...baseSummary,
        walletCurrency: null,
        remainingQuantity: 0,
        instrumentPriceCurrency: null,
      },
      manualPriceInput: '',
      canSavePrice: false,
      isSavingPrice: true,
      saveError: 'Failed to save price.',
      mode: 'multi',
      selectedInstrumentCount: 2,
    });

    expect(viewModel.mode).toBe('multi');
    expect(viewModel.totals.selectedInstrumentCount).toBe(2);
    expect(viewModel.priceEditor).toEqual({
      input: '',
      currency: null,
      canSave: false,
      isSaving: true,
      error: 'Failed to save price.',
      show: false,
    });
  });
});
