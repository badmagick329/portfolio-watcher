import { Button } from '@/components/ui/button';
import { formatSignedCurrencyAmount } from '@/lib/client/orders-list-format';

type OrdersSummaryProps = {
  walletCurrency: string | null;
  remainingQuantity: number;
  estimatedTotal: number;
  estimatedPositionValue: number;
  manualPriceInput: string;
  setManualPriceInput: (value: string) => void;
  instrumentPriceCurrency: string | null;
  canSavePrice: boolean;
  isSavingPrice: boolean;
  onSavePrice: () => void;
  saveError: string | null;
};

function OrdersSummary({
  walletCurrency,
  remainingQuantity,
  estimatedTotal,
  estimatedPositionValue,
  manualPriceInput,
  setManualPriceInput,
  instrumentPriceCurrency,
  canSavePrice,
  isSavingPrice,
  onSavePrice,
  saveError,
}: OrdersSummaryProps) {
  return (
    <div className='flex flex-col items-center gap-1'>
      <p>
        Estimated total:{' '}
        {walletCurrency
          ? formatSignedCurrencyAmount(estimatedTotal, walletCurrency)
          : 'n/a (mixed currencies)'}
      </p>
      {walletCurrency && remainingQuantity > 0 ? (
        <div className='flex flex-col items-center gap-1'>
          <p>
            Holding: {remainingQuantity} shares | Value used:{' '}
            {formatSignedCurrencyAmount(
              estimatedPositionValue,
              walletCurrency,
            )}
          </p>
          <label className='flex items-center gap-2'>
            <span>Price used:</span>
            <input
              className='w-32 border border-input bg-background px-2 py-1 text-sm'
              type='number'
              step='any'
              value={manualPriceInput}
              onChange={(event) => setManualPriceInput(event.target.value)}
            />
            <span>{instrumentPriceCurrency ?? ''}</span>
            <Button
              type='button'
              size='sm'
              onClick={onSavePrice}
              disabled={!canSavePrice || isSavingPrice}
            >
              {isSavingPrice ? 'Saving...' : 'Save'}
            </Button>
          </label>
          {saveError ? <p className='text-sm text-destructive'>{saveError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export { OrdersSummary };
