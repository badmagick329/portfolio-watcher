'use client';

import { OrdersList } from '@/app/_components/OrdersList';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import type {
  WebHistoricalOrder,
  WebHistoricalOrderInstrument,
} from '@portfolio/domain';
import { useState } from 'react';

type InstrumentPickerProps = {
  instruments: WebHistoricalOrderInstrument[];
  orders: WebHistoricalOrder[];
};

export function InstrumentPicker({
  instruments,
  orders,
}: InstrumentPickerProps) {
  const [selectedInstrument, setSelectedInstrument] =
    useState<WebHistoricalOrderInstrument | null>(null);
  const filteredOrders = orders.filter(
    (order) =>
      order.ticker === selectedInstrument?.ticker && order.status === 'FILLED',
  );

  return (
    <div className='flex w-full flex-col space-y-3'>
      <Combobox
        items={instruments}
        value={selectedInstrument}
        onValueChange={(value) => setSelectedInstrument(value)}
        itemToStringLabel={(instrument) => instrument.name}
        itemToStringValue={(instrument) => instrument.ticker}
        isItemEqualToValue={(item, value) => item.isin === value.isin}
      >
        <ComboboxInput
          className='w-full'
          placeholder='Select instruments by name'
          showClear
        />

        <ComboboxContent className='w-full'>
          <ComboboxEmpty>No instruments found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(instrument: WebHistoricalOrderInstrument) => (
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

      {selectedInstrument ? (
        <pre>
          <p>
            {selectedInstrument.name} ({selectedInstrument.ticker})
          </p>
        </pre>
      ) : null}

      {!selectedInstrument ? (
        <p>Select an instrument.</p>
      ) : (
        <OrdersList orders={filteredOrders} />
      )}
    </div>
  );
}
