'use client';

import type { AppCapabilitiesData } from '@/lib/client/app-capabilities';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
  filterOrdersByFilledDateRange,
  type FillDateRangeFilter,
} from '@/lib/client/portfolio/fill-date-filter';
import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '@/lib/client/portfolio/instrument-price';
import {
  filterOrdersBySelection,
  getActiveInstrumentsFromFilteredOrders,
} from './instrument-selection';
import {
  getOrdersViewUrlState,
  getSearchParamsWithUpdatedOrdersViewUrlState,
  type OrdersViewMode,
  type OrdersViewUrlState,
} from './orders-view-url-state';
import type { WebHistoricalOrder } from '@portfolio/domain';

type UseOrdersExplorerControllerParams = {
  capabilities: AppCapabilitiesData;
  instruments: InstrumentWithStoredPrice[];
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
};

type OrdersFilterModel = {
  comboboxOpen: boolean;
  emptyMessage: string;
  fillDateRangeFilter: FillDateRangeFilter;
  instruments: InstrumentWithStoredPrice[];
  isAllMode: boolean;
  isSingleMode: boolean;
  mode: OrdersViewMode;
  selectedInstruments: InstrumentWithStoredPrice[];
  selectedIsins: string[];
  selectionLabel: string | null;
};

type OrdersFilterActions = {
  removeSelectedInstrument: (instrument: InstrumentWithStoredPrice) => void;
  setComboboxOpen: (open: boolean) => void;
  setFillDateRangeFilter: (value: FillDateRangeFilter) => void;
  setMode: (mode: OrdersViewMode) => void;
  setSelectedInstruments: (value: InstrumentWithStoredPrice[]) => void;
};

type OrdersExplorerListModel = {
  activeInstruments: InstrumentWithStoredPrice[];
  currentPage: number;
  filteredOrders: WebHistoricalOrder[];
  hasActiveFillDateFilter: boolean;
  hideValues: boolean;
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  listKey: string;
  selectionMode: OrdersViewMode;
};

type OrdersExplorerListActions = {
  setPage: (page: number) => void;
};

function useOrdersExplorerController({
  capabilities,
  instruments,
  latestAccountSummarySnapshot,
  orders,
}: UseOrdersExplorerControllerParams) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const urlState = getOrdersViewUrlState(searchParams);
  const selection = {
    mode: urlState.mode,
    selectedIsins: urlState.selectedIsins,
  };
  const fillDateRangeFilter = {
    filledFrom: urlState.filledFrom,
    filledTo: urlState.filledTo,
  };
  const hasActiveFillDateFilter = Boolean(
    fillDateRangeFilter.filledFrom || fillDateRangeFilter.filledTo,
  );
  const isAllMode = selection.mode === 'all';
  const isSingleMode = selection.mode === 'single';
  const selectedInstruments = instruments.filter((instrument) =>
    selection.selectedIsins.includes(instrument.isin),
  );
  const selectionFilteredOrders = filterOrdersBySelection(orders, selection);
  const filteredOrders = filterOrdersByFilledDateRange(
    selectionFilteredOrders,
    fillDateRangeFilter,
  );
  const activeInstruments = getActiveInstrumentsFromFilteredOrders(
    instruments,
    filteredOrders,
  );
  const selectionLabel =
    selection.mode === 'all'
      ? 'All instruments'
      : selectedInstruments.length === 1
        ? `${selectedInstruments[0]!.name} (${selectedInstruments[0]!.ticker})`
        : selectedInstruments.length > 1
          ? `${selectedInstruments.length} instruments selected`
          : null;
  const emptyMessage =
    orders.length === 0
      ? capabilities.canSyncOrders
        ? 'No historical orders yet. Sync orders to get started.'
        : 'Add Trading 212 API credentials to sync orders.'
      : (selection.mode === 'include' || selection.mode === 'single') &&
          selection.selectedIsins.length === 0
        ? selection.mode === 'single'
          ? 'Select an instrument.'
          : 'Select one or more instruments.'
        : 'No instruments match the current filter.';

  const replaceUrlState = (
    partialState: Partial<OrdersViewUrlState>,
    options: { resetPage?: boolean } = {},
  ) => {
    const nextSearchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      searchParams,
      options.resetPage
        ? {
            ...partialState,
            page: 1,
          }
        : partialState,
    );
    const queryString = nextSearchParams.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const setMode = (mode: OrdersViewMode) => {
    if (mode === 'all') {
      setIsComboboxOpen(false);
    }

    replaceUrlState({ mode }, { resetPage: true });
  };

  const setSelectedInstruments = (value: InstrumentWithStoredPrice[]) => {
    const selectedIsins = isSingleMode
      ? value.length > 0
        ? [value[value.length - 1]!.isin]
        : []
      : value.map((instrument) => instrument.isin);

    replaceUrlState(
      {
        mode: selection.mode === 'all' ? 'single' : selection.mode,
        selectedIsins,
      },
      { resetPage: true },
    );

    setIsComboboxOpen(!isSingleMode);
  };

  const removeSelectedInstrument = (instrument: InstrumentWithStoredPrice) => {
    replaceUrlState(
      {
        selectedIsins: selection.selectedIsins.filter(
          (value) => value !== instrument.isin,
        ),
      },
      { resetPage: true },
    );
  };

  return {
    filterActions: {
      removeSelectedInstrument,
      setComboboxOpen: (open) => setIsComboboxOpen(open && !isAllMode),
      setFillDateRangeFilter: (value) =>
        replaceUrlState(value, { resetPage: true }),
      setMode,
      setSelectedInstruments,
    } satisfies OrdersFilterActions,
    filterModel: {
      comboboxOpen: !isAllMode && isComboboxOpen,
      emptyMessage,
      fillDateRangeFilter,
      instruments,
      isAllMode,
      isSingleMode,
      mode: selection.mode,
      selectedInstruments,
      selectedIsins: selection.selectedIsins,
      selectionLabel,
    } satisfies OrdersFilterModel,
    ordersActions: {
      setPage: (page) => replaceUrlState({ page }),
    } satisfies OrdersExplorerListActions,
    ordersModel: {
      activeInstruments,
      currentPage: urlState.page,
      filteredOrders,
      hasActiveFillDateFilter,
      hideValues: urlState.hideValues,
      latestAccountSummarySnapshot,
      listKey: `${selection.mode}:${fillDateRangeFilter.filledFrom ?? ''}:${
        fillDateRangeFilter.filledTo ?? ''
      }:${activeInstruments
        .map((instrument) => instrument.isin)
        .sort()
        .join(',')}`,
      selectionMode: selection.mode,
    } satisfies OrdersExplorerListModel,
  };
}

export { useOrdersExplorerController };
export type {
  OrdersExplorerListActions,
  OrdersExplorerListModel,
  OrdersFilterActions,
  OrdersFilterModel,
};
