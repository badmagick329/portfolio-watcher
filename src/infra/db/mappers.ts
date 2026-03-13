import type {
  FillTaxRow,
  HistoricalOrderRow,
  HistoricalOrderWriteSet,
} from '@/infra/db/types';
import type {
  HistoricalOrdersItem,
  HistoricalOrdersItems,
} from '@/types/schemas/api-responses';

const mapApiOrderItemToDbObjects = (
  item: HistoricalOrdersItem,
): HistoricalOrderWriteSet => {
  const instrument = {
    ticker: item.order.instrument.ticker,
    name: item.order.instrument.name,
    isin: item.order.instrument.isin,
    currency: item.order.instrument.currency,
  };

  const order = {
    id: item.order.id,
    strategy: item.order.strategy,
    type: item.order.type,
    ticker: item.order.ticker,
    quantity: item.order.quantity,
    filledQuantity: item.order.filledQuantity,
    value: item.order.value,
    filledValue: item.order.filledValue,
    limitPrice: item.order.limitPrice,
    status: item.order.status,
    currency: item.order.currency,
    extendedHours: item.order.extendedHours,
    initiatedFrom: item.order.initiatedFrom,
    side: item.order.side,
    createdAt: item.order.createdAt,
  };

  let fill: HistoricalOrderWriteSet['fill'] = undefined;
  let fillTaxes: HistoricalOrderWriteSet['fillTaxes'] = [];

  if (item.fill) {
    fill = {
      id: item.fill.id,
      orderId: item.order.id,
      quantity: item.fill.quantity,
      price: item.fill.price,
      type: item.fill.type,
      tradingMethod: item.fill.tradingMethod,
      filledAt: item.fill.filledAt,

      walletCurrency: item.fill.walletImpact.currency,
      walletNetValue: item.fill.walletImpact.netValue,
      walletFxRate: item.fill.walletImpact.fxRate,
    };
    const taxFill = item.fill;
    item.fill.walletImpact.taxes.forEach((t) =>
      fillTaxes.push({
        fillId: taxFill.id,
        name: t.name,
        quantity: t.quantity,
        currency: t.currency,
        chargedAt: t.chargedAt,
      }),
    );
  }

  return {
    instrument,
    order,
    fill,
    fillTaxes,
  };
};

const mapDbHistoricalOrdersToApi = (
  orderRows: HistoricalOrderRow[],
  taxRows: FillTaxRow[],
): HistoricalOrdersItems => {
  const taxesByFillId = new Map<number, typeof taxRows>();

  taxRows.forEach((tax) => {
    const existing = taxesByFillId.get(tax.fillId) ?? [];
    existing.push(tax);
    taxesByFillId.set(tax.fillId, existing);
  });

  return orderRows.map((row) => ({
    order: {
      id: row.orderId,
      strategy: row.strategy,
      type: row.type,
      ticker: row.ticker,
      quantity: row.quantity ?? undefined,
      filledQuantity: row.filledQuantity ?? undefined,
      value: row.value ?? undefined,
      filledValue: row.filledValue ?? undefined,
      limitPrice: row.limitPrice ?? undefined,
      status: row.status,
      currency: row.currency,
      extendedHours: row.extendedHours,
      initiatedFrom: row.initiatedFrom,
      side: row.side,
      createdAt: row.createdAt,
      instrument: {
        ticker: row.instrumentTicker,
        name: row.instrumentName,
        isin: row.instrumentIsin,
        currency: row.instrumentCurrency,
      },
    },
    fill: row.fillId
      ? {
          id: row.fillId,
          quantity: row.fillQuantity!,
          price: row.fillPrice!,
          type: row.fillType!,
          tradingMethod: row.fillTradingMethod!,
          filledAt: row.fillFilledAt!,
          walletImpact: {
            currency: row.fillWalletCurrency!,
            netValue: row.fillWalletNetValue!,
            fxRate: row.fillWalletFxRate!,
            taxes: (taxesByFillId.get(row.fillId) ?? []).map((tax) => ({
              name: tax.name,
              quantity: tax.quantity,
              currency: tax.currency,
              chargedAt: tax.chargedAt,
            })),
          },
        }
      : undefined,
  })) satisfies HistoricalOrdersItems;
};

export { mapDbHistoricalOrdersToApi, mapApiOrderItemToDbObjects };
