import { Button } from '@/components/ui/button';
import { formatSignedCurrencyAmount } from '@/lib/client/orders-list-format';
import type {
  OrdersSummaryActions,
  OrdersSummaryViewModel,
} from '@/lib/client/orders-summary-view-model';

type OrdersSummaryProps = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function OrdersSummary({ viewModel, actions }: OrdersSummaryProps) {
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
            Holding: {viewModel.totals.remainingQuantity} shares | Value used:{' '}
            {formatSignedCurrencyAmount(
              viewModel.totals.estimatedPositionValue,
              viewModel.totals.walletCurrency!,
            )}
          </p>
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
