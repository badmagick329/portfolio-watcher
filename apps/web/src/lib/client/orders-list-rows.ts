import type { WebHistoricalOrder } from '@portfolio/domain';
import { formatOrderAmount, formatOrderPrice } from './orders-list-format';
import { getOrderQuantity } from './orders-list-math';
import { formatCompactDisplayDateTime } from './orders-summary-presentation';

type OrdersListRow = {
  id: number;
  date: string;
  instrumentName: string;
  side: string;
  quantityDisplay: number | 'n/a';
  priceDisplay: string;
  amountDisplay: string;
};

function buildOrdersListRows(orders: WebHistoricalOrder[]): OrdersListRow[] {
  return orders.map((order) => ({
    id: order.id,
    date: formatCompactDisplayDateTime(order.createdAt),
    instrumentName: order.instrument.name,
    side: order.side,
    quantityDisplay: getOrderQuantity(order) ?? 'n/a',
    priceDisplay: formatOrderPrice(order),
    amountDisplay: formatOrderAmount(order),
  }));
}

export { buildOrdersListRows };
export type { OrdersListRow };
