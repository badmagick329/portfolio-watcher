import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemValue,
} from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import {
  formatInstrumentPrice,
  formatPercentage,
  formatShareQuantity,
  formatSignedCurrencyAmount,
  formatUnsignedCurrencyAmount,
} from '@/lib/client/orders-list-format';
import {
  formatPriceAsOf,
  getCurrentPriceSourceLabel,
  METRIC_HELP_TEXT,
  MetricLabelWithTooltip,
} from '@/lib/client/orders-summary-presentation';
import type {
  OrdersSummaryActions,
  OrdersSummaryViewModel,
} from '@/lib/client/orders-summary-view-model';
import { cn } from '@/lib/utils';

type OrdersSummaryProps = {
  viewModel: OrdersSummaryViewModel;
  actions: OrdersSummaryActions;
};

function OrdersSummary({
  viewModel,
  actions,
}: OrdersSummaryProps) {
  const currentPriceSourceLabel = getCurrentPriceSourceLabel(
    viewModel.positionMetrics.currentPrice?.source,
  );
  const estimatedTotalLabel = viewModel.totals.walletCurrency
    ? formatSignedCurrencyAmount(
        viewModel.totals.estimatedTotal,
        viewModel.totals.walletCurrency,
      )
    : 'n/a (mixed currencies)';
  const currentValueLabel = viewModel.totals.walletCurrency
    ? formatSignedCurrencyAmount(
        viewModel.totals.estimatedPositionValue,
        viewModel.totals.walletCurrency,
      )
    : 'n/a (mixed currencies)';
  const estimatedTotalClassName =
    viewModel.totals.estimatedTotal > 0
      ? 'text-green-600 dark:text-green-400'
      : viewModel.totals.estimatedTotal < 0
        ? 'text-red-600 dark:text-red-400'
        : '';
  const unrealizedPnLClassName =
    viewModel.positionMetrics.unrealizedPnL !== null &&
    viewModel.positionMetrics.unrealizedPnL > 0
      ? 'text-green-600 dark:text-green-400'
      : viewModel.positionMetrics.unrealizedPnL !== null &&
          viewModel.positionMetrics.unrealizedPnL < 0
        ? 'text-red-600 dark:text-red-400'
        : '';
  const unrealizedPnLPercentClassName =
    viewModel.positionMetrics.unrealizedPnLPercent !== null &&
    viewModel.positionMetrics.unrealizedPnLPercent > 0
      ? 'text-green-600 dark:text-green-400'
      : viewModel.positionMetrics.unrealizedPnLPercent !== null &&
          viewModel.positionMetrics.unrealizedPnLPercent < 0
        ? 'text-red-600 dark:text-red-400'
        : '';

  return (
    <Card className='w-full min-[1300px]:max-w-none'>
      <CardHeader className='flex-col items-start border-b border-border gap-4 sm:flex-row sm:items-start'>
        <div className='space-y-1'>
          <CardTitle>Position Summary</CardTitle>
          <CardDescription>
            {viewModel.mode === 'single'
              ? 'Current valuation and holding metrics for the selected instrument.'
              : 'Aggregate metrics for the currently filtered instruments.'}
          </CardDescription>
        </div>
        <CardAction className='w-full sm:w-auto'>
          <div className='text-left sm:text-right'>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>
              Estimated total
            </div>
            <div
              className={cn(
                'font-heading text-lg font-semibold',
                estimatedTotalClassName,
              )}
            >
              {estimatedTotalLabel}
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className='space-y-4 pt-4'>
        {viewModel.mode === 'multi' ? (
          <div className='space-y-3 min-[1300px]:grid min-[1300px]:grid-cols-2 min-[1300px]:gap-6 min-[1300px]:space-y-0'>
            <Item>
              <ItemContent>
                <ItemTitle>Selection</ItemTitle>
                <ItemDescription>
                  Instruments currently included in the aggregate view.
                </ItemDescription>
              </ItemContent>
              <ItemValue>{viewModel.totals.selectedInstrumentCount}</ItemValue>
            </Item>
            <Item>
              <ItemContent>
                <ItemTitle>Current value</ItemTitle>
                <ItemDescription>
                  Combined current value of the filtered holdings.
                </ItemDescription>
              </ItemContent>
              <ItemValue>{currentValueLabel}</ItemValue>
            </Item>
          </div>
        ) : null}

        {viewModel.priceEditor.show ? (
          <div className='space-y-4 min-[1300px]:grid min-[1300px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,1.2fr)] min-[1300px]:gap-6 min-[1300px]:space-y-0'>
            <div className='space-y-3'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Overview
              </div>
              <Item>
                <ItemContent>
                  <ItemTitle>Holding</ItemTitle>
                  <ItemDescription>Shares currently held.</ItemDescription>
                </ItemContent>
                <ItemValue>
                  {formatShareQuantity(viewModel.totals.remainingQuantity)} shares
                </ItemValue>
              </Item>
            </div>

            <Separator className='min-[1300px]:hidden' />

            <div className='space-y-3'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Pricing
              </div>
              <Item>
                <ItemContent>
                  <ItemTitle>Current price</ItemTitle>
                  <ItemDescription>
                    The price currently being used for valuation.
                  </ItemDescription>
                </ItemContent>
                <ItemValue>
                  {formatInstrumentPrice(
                    viewModel.positionMetrics.currentPrice?.value ?? null,
                    viewModel.positionMetrics.currentPrice?.currency ??
                      viewModel.priceEditor.currency,
                  )}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Price source</ItemTitle>
                  <ItemDescription>Where the current price came from.</ItemDescription>
                </ItemContent>
                <ItemValue>
                  <Badge variant='secondary'>{currentPriceSourceLabel}</Badge>
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Price as of</ItemTitle>
                  <ItemDescription>Timestamp attached to the current price.</ItemDescription>
                </ItemContent>
                <ItemValue>
                  {formatPriceAsOf(viewModel.positionMetrics.currentPrice?.asOf)}
                </ItemValue>
              </Item>
              <div className='space-y-2 border border-border p-3'>
                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  <MetricLabelWithTooltip
                    label='Price override'
                    helpText={METRIC_HELP_TEXT.priceOverride}
                  />
                </div>
                <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
                  <InputGroup className='min-w-0 w-full flex-1'>
                    <InputGroupAddon>
                      <InputGroupText>Override price</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type='text'
                      inputMode='decimal'
                      value={viewModel.priceEditor.input}
                      onChange={(event) =>
                        actions.setManualPriceInput(event.target.value)
                      }
                    />
                    <InputGroupAddon align='inline-end'>
                      <InputGroupText>
                        {viewModel.priceEditor.currency ?? ''}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <Button
                    type='button'
                    size='sm'
                    className='w-full sm:w-auto'
                    onClick={actions.savePrice}
                    disabled={
                      !viewModel.priceEditor.canSave ||
                      viewModel.priceEditor.isSaving
                    }
                  >
                    {viewModel.priceEditor.isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {viewModel.priceEditor.error ? (
                  <p className='text-sm text-destructive'>
                    {viewModel.priceEditor.error}
                  </p>
                ) : null}
              </div>
            </div>

            <Separator className='min-[1300px]:hidden' />

            <div className='space-y-3'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Position
              </div>
              <Item>
                <ItemContent>
                  <ItemTitle>Current value</ItemTitle>
                  <ItemDescription>
                    Current market value of the shares still held.
                  </ItemDescription>
                </ItemContent>
                <ItemValue>
                  {formatUnsignedCurrencyAmount(
                    viewModel.positionMetrics.currentValue,
                    viewModel.totals.walletCurrency!,
                  )}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>
                    <MetricLabelWithTooltip
                      label='Average cost'
                      helpText={METRIC_HELP_TEXT.averageCost}
                    />
                  </ItemTitle>
                </ItemContent>
                <ItemValue>
                  {formatUnsignedCurrencyAmount(
                    viewModel.positionMetrics.averageCost,
                    viewModel.totals.walletCurrency!,
                  )}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>
                    <MetricLabelWithTooltip
                      label='Cost basis'
                      helpText={METRIC_HELP_TEXT.costBasis}
                    />
                  </ItemTitle>
                </ItemContent>
                <ItemValue>
                  {formatUnsignedCurrencyAmount(
                    viewModel.positionMetrics.costBasis,
                    viewModel.totals.walletCurrency!,
                  )}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>
                    <MetricLabelWithTooltip
                      label='Unrealized P/L'
                      helpText={METRIC_HELP_TEXT.unrealizedPnL}
                    />
                  </ItemTitle>
                </ItemContent>
                <ItemValue className={unrealizedPnLClassName}>
                  {formatSignedCurrencyAmount(
                    viewModel.positionMetrics.unrealizedPnL,
                    viewModel.totals.walletCurrency!,
                  )}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Unrealized P/L %</ItemTitle>
                </ItemContent>
                <ItemValue className={unrealizedPnLPercentClassName}>
                  {formatPercentage(viewModel.positionMetrics.unrealizedPnLPercent)}
                </ItemValue>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>
                    <MetricLabelWithTooltip
                      label='Net cashflow'
                      helpText={METRIC_HELP_TEXT.netCashflow}
                    />
                  </ItemTitle>
                </ItemContent>
                <ItemValue>
                  {formatSignedCurrencyAmount(
                    viewModel.positionMetrics.netCashflow,
                    viewModel.totals.walletCurrency!,
                  )}
                </ItemValue>
              </Item>
            </div>
          </div>
        ) : null}

        {viewModel.mode === 'single' && !viewModel.priceEditor.show ? (
          <div className='text-sm text-muted-foreground'>
            No active holding metrics are available for the current filter.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { OrdersSummary };
