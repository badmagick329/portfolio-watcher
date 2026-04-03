import type { InstrumentWithStoredPrice } from './instrument-price';
import type { WebHistoricalOrder } from '@portfolio/domain';

type InstrumentSelectionState = {
  mode: 'all' | 'include' | 'exclude';
  selectedIsins: string[];
};

const createInstrumentSelection = (
  selectedIsins: string[] = [],
): InstrumentSelectionState => ({
  mode: 'include',
  selectedIsins,
});

const setInstrumentSelectionMode = (
  selection: InstrumentSelectionState,
  mode: InstrumentSelectionState['mode'],
): InstrumentSelectionState => ({
  ...selection,
  mode,
});

const toggleInstrumentSelection = (
  selection: InstrumentSelectionState,
  isin: string,
): InstrumentSelectionState => ({
  ...selection,
  selectedIsins: selection.selectedIsins.includes(isin)
    ? selection.selectedIsins.filter((value) => value !== isin)
    : [...selection.selectedIsins, isin],
});

const filterOrdersBySelection = (
  orders: WebHistoricalOrder[],
  selection: InstrumentSelectionState,
) => {
  const filledOrders = orders.filter((order) => order.status === 'FILLED');

  if (selection.mode === 'all') {
    return filledOrders;
  }

  if (selection.mode === 'exclude') {
    if (selection.selectedIsins.length === 0) {
      return filledOrders;
    }

    return filledOrders.filter(
      (order) => !selection.selectedIsins.includes(order.instrument.isin),
    );
  }

  if (selection.selectedIsins.length === 0) {
    return [];
  }

  return filledOrders.filter((order) =>
    selection.selectedIsins.includes(order.instrument.isin),
  );
};

const getActiveInstrumentsFromFilteredOrders = (
  instruments: InstrumentWithStoredPrice[],
  filteredOrders: WebHistoricalOrder[],
) => {
  const activeIsins = new Set(filteredOrders.map((order) => order.instrument.isin));

  return instruments.filter((instrument) => activeIsins.has(instrument.isin));
};

export {
  createInstrumentSelection,
  filterOrdersBySelection,
  getActiveInstrumentsFromFilteredOrders,
  setInstrumentSelectionMode,
  toggleInstrumentSelection,
};
export type { InstrumentSelectionState };
