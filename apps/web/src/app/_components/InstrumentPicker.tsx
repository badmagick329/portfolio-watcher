'use client';

import { useState } from 'react';
import type {
  WebHistoricalOrder,
  WebHistoricalOrderInstrument,
} from '@portfolio/domain';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

type InstrumentPickerProps = {
  instruments: WebHistoricalOrderInstrument[];
  orders: WebHistoricalOrder[];
};

export function InstrumentPicker({
  instruments,
  orders,
}: InstrumentPickerProps) {
  const [selectedInstruments, setSelectedInstruments] = useState<
    WebHistoricalOrderInstrument[]
  >([]);
  const selectedTickers = new Set(
    selectedInstruments.map((instrument) => instrument.ticker)
  );
  const filteredOrders = orders.filter((order) =>
    selectedTickers.has(order.ticker)
  );

  return (
    <div className='w-full max-w-xl space-y-3'>
      <Combobox
        multiple
        items={instruments}
        value={selectedInstruments}
        onValueChange={(value) => setSelectedInstruments(value)}
        itemToStringLabel={(instrument) => instrument.name}
        itemToStringValue={(instrument) => instrument.ticker}
        isItemEqualToValue={(item, value) => item.isin === value.isin}
      >
        <ComboboxChips className='w-full'>
          {selectedInstruments.map((instrument) => (
            <ComboboxChip key={instrument.isin}>{instrument.name}</ComboboxChip>
          ))}
          <ComboboxChipsInput placeholder='Select instruments by name' />
        </ComboboxChips>

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

      {selectedInstruments.length > 0 ? (
        <pre>
          {selectedInstruments.map((instrument) => (
            <p key={instrument.isin}>
              {instrument.name} ({instrument.ticker})
            </p>
          ))}
        </pre>
      ) : null}

      <pre>
        {selectedInstruments.length === 0 ? (
          <p>Select one or more instruments.</p>
        ) : (
          filteredOrders.map((order) => (
            <p key={order.id}>{`${order.createdAt} - ${order.ticker}`}</p>
          ))
        )}
      </pre>
    </div>
  );
}
