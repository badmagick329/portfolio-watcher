'use client';

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
  useOrdersExplorerController,
} from '@/lib/client/orders/useOrdersExplorerController';
import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '@/lib/client/portfolio/instrument-price';
import type { WebHistoricalOrder } from '@portfolio/domain';

type OrdersFilterPanelProps = {
  instruments: InstrumentWithStoredPrice[];
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
};

function OrdersFilterPanel({
  instruments,
  latestAccountSummarySnapshot,
  orders,
}: OrdersFilterPanelProps) {
  const { filterActions, filterModel, ordersActions, ordersModel } =
    useOrdersExplorerController({
      instruments,
      latestAccountSummarySnapshot,
      orders,
    });

  return (
    <div className='flex w-full flex-col space-y-3'>
      <div className='flex gap-2'>
        <Button
          type='button'
          size='sm'
          variant={filterModel.mode === 'all' ? 'default' : 'outline'}
          onClick={() => filterActions.setMode('all')}
        >
          All
        </Button>
        <Button
          type='button'
          size='sm'
          variant={filterModel.mode === 'single' ? 'default' : 'outline'}
          onClick={() => filterActions.setMode('single')}
        >
          Single
        </Button>
        <Button
          type='button'
          size='sm'
          variant={filterModel.mode === 'include' ? 'default' : 'outline'}
          onClick={() => filterActions.setMode('include')}
        >
          Include
        </Button>
        <Button
          type='button'
          size='sm'
          variant={filterModel.mode === 'exclude' ? 'default' : 'outline'}
          onClick={() => filterActions.setMode('exclude')}
        >
          Exclude
        </Button>
      </div>

      <FillDateRangePicker
        value={filterModel.fillDateRangeFilter}
        onChange={filterActions.setFillDateRangeFilter}
      />

      <Combobox
        open={filterModel.comboboxOpen}
        multiple
        items={filterModel.instruments}
        value={filterModel.selectedInstruments}
        onOpenChange={filterActions.setComboboxOpen}
        onValueChange={filterActions.setSelectedInstruments}
        itemToStringLabel={(instrument) => instrument.name}
        itemToStringValue={(instrument) => instrument.ticker}
        isItemEqualToValue={(item, value) => item.isin === value.isin}
      >
        <ComboboxInput
          className='w-full'
          disabled={filterModel.isAllMode}
          placeholder='Select instruments by name'
          showClear
        />

        <ComboboxContent className='w-full'>
          <ComboboxEmpty>No instruments found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(instrument: InstrumentWithStoredPrice) => {
                const isSelected = filterModel.selectedIsins.includes(
                  instrument.isin,
                );

                return (
                  <ComboboxItem
                    key={instrument.isin}
                    value={instrument}
                    className={
                      !filterModel.isSingleMode && isSelected
                        ? 'bg-accent/60 text-accent-foreground'
                        : undefined
                    }
                  >
                    <span className='truncate'>{instrument.name}</span>
                    <span
                      className={`ml-auto ${
                        !filterModel.isSingleMode && isSelected
                          ? 'text-accent-foreground/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {instrument.ticker}
                    </span>
                  </ComboboxItem>
                );
              }}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {filterModel.selectedInstruments.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {filterModel.selectedInstruments.map((instrument) => (
            <Button
              key={instrument.isin}
              type='button'
              size='sm'
              variant='outline'
              disabled={filterModel.isAllMode}
              onClick={() => filterActions.removeSelectedInstrument(instrument)}
            >
              {instrument.name}
            </Button>
          ))}
        </div>
      ) : null}

      {filterModel.selectionLabel ? (
        <div className='max-w-full break-words font-mono text-xl leading-tight sm:text-2xl'>
          {filterModel.selectionLabel}
        </div>
      ) : null}

      {ordersModel.filteredOrders.length === 0 ? (
        <p>{filterModel.emptyMessage}</p>
      ) : (
        <OrdersList
          key={ordersModel.listKey}
          hasActiveFillDateFilter={ordersModel.hasActiveFillDateFilter}
          currentPage={ordersModel.currentPage}
          hideValues={ordersModel.hideValues}
          latestAccountSummarySnapshot={
            ordersModel.latestAccountSummarySnapshot
          }
          orders={ordersModel.filteredOrders}
          onPageChange={ordersActions.setPage}
          selectionMode={ordersModel.selectionMode}
          selectedInstruments={ordersModel.activeInstruments}
        />
      )}
    </div>
  );
}

export { OrdersFilterPanel };
