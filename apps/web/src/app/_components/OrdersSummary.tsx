import { Button } from '@/components/ui/button';
import {
  formatInstrumentPrice,
  formatPercentage,
  formatShareQuantity,
  formatSignedCurrencyAmount,
  formatUnsignedCurrencyAmount,
} from '@/lib/client/orders-list-format';
import type {
  OrdersSummaryActions,
  OrdersSummaryViewModel,
} from '@/lib/client/orders-summary-view-model';

type OrdersSummaryProps = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function OrdersSummary({ viewModel, actions }: OrdersSummaryProps) {
  const currentPriceSourceLabel =
    viewModel.positionMetrics.currentPrice?.source === 'manual'
      ? 'Manual'
      : viewModel.positionMetrics.currentPrice?.source === 'stored'
        ? 'Stored'
        : viewModel.positionMetrics.currentPrice?.source === 'derived_from_fill'
          ? 'Derived from fill'
          : null;

  return (
    <div className='flex flex-col items-center gap-1'>
      <p>
        Estimated total:{' '}
        {viewModel.totals.walletCurrency
          ? formatSignedCurrencyAmount(
              viewModel.totals.estimatedTotal,
              viewModel.totals.walletCurrency,
            )
          : 'n/a (mixed currencies)'}
      </p>
      {viewModel.mode === 'multi' &&
      viewModel.totals.walletCurrency &&
      viewModel.totals.selectedInstrumentCount > 1 ? (
        <p>
          Selected instruments: {viewModel.totals.selectedInstrumentCount} | Value
          used:{' '}
          {formatSignedCurrencyAmount(
            viewModel.totals.estimatedPositionValue,
            viewModel.totals.walletCurrency,
          )}
        </p>
      ) : null}
      {viewModel.priceEditor.show ? (
        <div className='flex flex-col items-center gap-1'>
          <p>
            Holding: {formatShareQuantity(viewModel.totals.remainingQuantity)} shares
          </p>
          <div className='grid grid-cols-2 gap-x-6 gap-y-1 text-sm'>
            <span>Current price</span>
            <span>
              {formatInstrumentPrice(
                viewModel.positionMetrics.currentPrice?.value ?? null,
                viewModel.positionMetrics.currentPrice?.currency ??
                  viewModel.priceEditor.currency,
              )}
            </span>
            <span>Price source</span>
            <span>{currentPriceSourceLabel ?? 'n/a'}</span>
            <span>Price as of</span>
            <span>{viewModel.positionMetrics.currentPrice?.asOf ?? 'n/a'}</span>
            <span>Current value</span>
            <span>
              {formatUnsignedCurrencyAmount(
                viewModel.positionMetrics.currentValue,
                viewModel.totals.walletCurrency!,
              )}
            </span>
            <span>Average cost</span>
            <span>
              {formatUnsignedCurrencyAmount(
                viewModel.positionMetrics.averageCost,
                viewModel.totals.walletCurrency!,
              )}
            </span>
            <span>Cost basis</span>
            <span>
              {formatUnsignedCurrencyAmount(
                viewModel.positionMetrics.costBasis,
                viewModel.totals.walletCurrency!,
              )}
            </span>
            <span>Unrealized P/L</span>
            <span>
              {formatSignedCurrencyAmount(
                viewModel.positionMetrics.unrealizedPnL,
                viewModel.totals.walletCurrency!,
              )}
            </span>
            <span>Unrealized P/L %</span>
            <span>
              {formatPercentage(viewModel.positionMetrics.unrealizedPnLPercent)}
            </span>
            <span>Net cashflow</span>
            <span>
              {formatSignedCurrencyAmount(
                viewModel.positionMetrics.netCashflow,
                viewModel.totals.walletCurrency!,
              )}
            </span>
          </div>
          <label className='flex items-center gap-2'>
            <span>Price used:</span>
            <input
              className='w-32 border border-input bg-background px-2 py-1 text-sm'
              type='number'
              step='any'
              value={viewModel.priceEditor.input}
              onChange={(event) => actions.setManualPriceInput(event.target.value)}
            />
            <span>{viewModel.priceEditor.currency ?? ''}</span>
            <Button
              type='button'
              size='sm'
              onClick={actions.savePrice}
              disabled={
                !viewModel.priceEditor.canSave || viewModel.priceEditor.isSaving
              }
            >
              {viewModel.priceEditor.isSaving ? 'Saving...' : 'Save'}
            </Button>
          </label>
          {viewModel.priceEditor.error ? (
            <p className='text-sm text-destructive'>
              {viewModel.priceEditor.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { OrdersSummary };
