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
  getFillDateRangeFilterFromSearchParams,
  getSearchParamsWithFillDateRange,
} from '@/lib/client/fill-date-filter';
import type { InstrumentWithStoredPrice } from '@/lib/client/instrument-price';
import {
  createInstrumentSelection,
  filterOrdersBySelection,
  getActiveInstrumentsFromFilteredOrders,
  type InstrumentSelectionState,
  setInstrumentSelectionMode,
  toggleInstrumentSelection,
} from '@/lib/client/instrument-selection';
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
  const [selection, setSelection] = useState<InstrumentSelectionState>(
    createInstrumentSelection(),
  );
  const fillDateRangeFilter = getFillDateRangeFilterFromSearchParams(searchParams);
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

  return (
    <div className='flex w-full flex-col space-y-3'>
      <div className='flex gap-2'>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'all' ? 'default' : 'outline'}
          onClick={() =>
            setSelection((current) =>
              setInstrumentSelectionMode(current, 'all'),
            )
          }
        >
          All
        </Button>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'include' ? 'default' : 'outline'}
          onClick={() =>
            setSelection((current) =>
              setInstrumentSelectionMode(current, 'include'),
            )
          }
        >
          Include
        </Button>
        <Button
          type='button'
          size='sm'
          variant={selection.mode === 'exclude' ? 'default' : 'outline'}
          onClick={() =>
            setSelection((current) =>
              setInstrumentSelectionMode(current, 'exclude'),
            )
          }
        >
          Exclude
        </Button>
      </div>

      <FillDateRangePicker
        value={fillDateRangeFilter}
        onChange={(nextFilter) => {
          const nextSearchParams = getSearchParamsWithFillDateRange(
            searchParams,
            nextFilter,
          );
          const queryString = nextSearchParams.toString();

          router.replace(
            queryString ? `${pathname}?${queryString}` : pathname,
            { scroll: false },
          );
        }}
      />

      <Combobox
        multiple
        items={instrumentOptions}
        value={selectedInstruments}
        onValueChange={(value) =>
          setSelection({
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
                setSelection((current) =>
                  toggleInstrumentSelection(current, instrument.isin),
                )
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
