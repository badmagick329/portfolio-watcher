'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { FillDateRangePicker } from '@/app/_components/FillDateRangePicker';
import { OrdersList } from '@/app/_components/OrdersList';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  filterOrdersByFilledDateRange,
} from '@/lib/client/fill-date-filter';
import type { InstrumentWithStoredPrice } from '@/lib/client/instrument-price';
import {
  filterOrdersBySelection,
  getActiveInstrumentsFromFilteredOrders,
} from '@/lib/client/instrument-selection';
import {
  getOrdersViewUrlState,
  getSearchParamsWithUpdatedOrdersViewUrlState,
} from '@/lib/client/orders-view-url-state';
import type { WebHistoricalOrder } from '@portfolio/domain';

type InstrumentPickerProps = {
  instruments: InstrumentWithStoredPrice[];
  orders: WebHistoricalOrder[];
};

export function InstrumentPicker({
  instruments,
  orders,
}: InstrumentPickerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [instrumentOptions, setInstrumentOptions] =
    useState<InstrumentWithStoredPrice[]>(instruments);
  const urlState = getOrdersViewUrlState(searchParams);
  const selection = {
    mode: urlState.mode,
    selectedIsins: urlState.selectedIsins,
  };
  const fillDateRangeFilter = {
    filledFrom: urlState.filledFrom,
    filledTo: urlState.filledTo,
  };
  const isAllMode = selection.mode === 'all';
  const selectedInstruments = instrumentOptions.filter((instrument) =>
    selection.selectedIsins.includes(instrument.isin),
  );
  const selectionFilteredOrders = filterOrdersBySelection(orders, selection);
  const filteredOrders = filterOrdersByFilledDateRange(
    selectionFilteredOrders,
    fillDateRangeFilter,
  );
  const activeInstruments = getActiveInstrumentsFromFilteredOrders(
    instrumentOptions,
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
    selection.mode === 'include' && selection.selectedIsins.length === 0
      ? 'Select one or more instruments.'
      : 'No instruments match the current filter.';
  const replaceUrlState = (
    partialState: Partial<typeof urlState>,
  ) => {
    const nextSearchParams = getSearchParamsWithUpdatedOrdersViewUrlState(
      searchParams,
      partialState,
    );
    const queryString = nextSearchParams.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div className='flex w-full flex-col space-y-3'>
      <div className='flex gap-2'>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'all' ? 'default' : 'outline'}
          onClick={() => replaceUrlState({ mode: 'all' })}
        >
          All
        </Button>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'include' ? 'default' : 'outline'}
          onClick={() => replaceUrlState({ mode: 'include' })}
        >
          Include
        </Button>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'exclude' ? 'default' : 'outline'}
          onClick={() => replaceUrlState({ mode: 'exclude' })}
        >
          Exclude
        </Button>
      </div>

      <FillDateRangePicker
        value={fillDateRangeFilter}
        onChange={(nextFilter) => replaceUrlState(nextFilter)}
      />

      <Combobox
        multiple
        items={instrumentOptions}
        value={selectedInstruments}
        onValueChange={(value) =>
          replaceUrlState({
            mode: selection.mode === 'all' ? 'include' : selection.mode,
            selectedIsins: value.map((instrument) => instrument.isin),
          })
        }
        itemToStringLabel={(instrument) => instrument.name}
        itemToStringValue={(instrument) => instrument.ticker}
        isItemEqualToValue={(item, value) => item.isin === value.isin}
      >
        <ComboboxInput
          className='w-full'
          disabled={isAllMode}
          placeholder='Select instruments by name'
          showClear
        />

        <ComboboxContent className='w-full'>
          <ComboboxEmpty>No instruments found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(instrument: InstrumentWithStoredPrice) => (
                <ComboboxItem key={instrument.isin} value={instrument}>
                  <span className='truncate'>{instrument.name}</span>
                  <span className='ml-auto text-muted-foreground'>
                    {instrument.ticker}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {selectedInstruments.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {selectedInstruments.map((instrument) => (
            <Button
              key={instrument.isin}
              type='button'
              size='sm'
              variant='outline'
              disabled={isAllMode}
              onClick={() =>
                replaceUrlState({
                  selectedIsins: selection.selectedIsins.includes(instrument.isin)
                    ? selection.selectedIsins.filter(
                        (value) => value !== instrument.isin,
                      )
                    : [...selection.selectedIsins, instrument.isin],
                })
              }
            >
              {instrument.name}
            </Button>
          ))}
        </div>
      ) : null}

      {selectionLabel ? (
        <pre>
          <p>
            {selectionLabel}
          </p>
        </pre>
      ) : null}

      {filteredOrders.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <OrdersList
          key={`${selection.mode}:${fillDateRangeFilter.filledFrom ?? ''}:${fillDateRangeFilter.filledTo ?? ''}:${activeInstruments
            .map((instrument) => instrument.isin)
            .sort()
            .join(',')}`}
          orders={filteredOrders}
          selectedInstruments={activeInstruments}
          onStoredPriceSaved={(isin, latestStoredPrice) => {
            setInstrumentOptions((current) =>
              current.map((instrument) =>
                instrument.isin === isin
                  ? { ...instrument, latestStoredPrice }
                  : instrument,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
