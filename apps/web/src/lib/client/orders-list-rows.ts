import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  formatOrderAmount,
  formatOrderPrice,
  formatPrivateQuantity,
  type PrivacyFormatOptions,
} from './orders-list-format';
import { getOrderQuantity } from './orders-list-math';
import { formatCompactDisplayDateTime } from './orders-summary-presentation';

type OrdersListRow = {
  id: number;
  date: string;
  instrumentName: string;
  side: string;
  quantityDisplay: string;
  priceDisplay: string;
  amountDisplay: string;
};

function buildOrdersListRows(
  orders: WebHistoricalOrder[],
  options: PrivacyFormatOptions = {},
): OrdersListRow[] {
  return orders.map((order) => ({
    id: order.id,
    date: formatCompactDisplayDateTime(order.createdAt),
    instrumentName: order.instrument.name,
    side: order.side,
    quantityDisplay: formatPrivateQuantity(getOrderQuantity(order), options),
    priceDisplay: formatOrderPrice(order, options),
    amountDisplay: formatOrderAmount(order, options),
  }));
}

export { buildOrdersListRows };
export type { OrdersListRow };
