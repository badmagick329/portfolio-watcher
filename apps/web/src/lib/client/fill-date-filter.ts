import type { WebHistoricalOrder } from '@portfolio/domain';
import { endOfDay, startOfDay } from 'date-fns';
import { parseQueryDate, type OrdersViewUrlState } from './orders-view-url-state';

type FillDateRangeFilter = Pick<OrdersViewUrlState, 'filledFrom' | 'filledTo'>;

const isFillWithinDateRange = (
  filledAt: string,
  filter: FillDateRangeFilter,
) => {
  const filledAtTime = Date.parse(filledAt);

  if (Number.isNaN(filledAtTime)) {
    return false;
  }

  const filledFromDate = parseQueryDate(filter.filledFrom);
  const filledToDate = parseQueryDate(filter.filledTo);

  if (filledFromDate && filledAtTime < startOfDay(filledFromDate).getTime()) {
    return false;
  }

  if (filledToDate && filledAtTime > endOfDay(filledToDate).getTime()) {
    return false;
  }

  return true;
};

const hasFillDateRangeFilter = (filter: FillDateRangeFilter) =>
  Boolean(filter.filledFrom || filter.filledTo);

const filterOrdersByFilledDateRange = (
  orders: WebHistoricalOrder[],
  filter: FillDateRangeFilter,
) => {
  if (!hasFillDateRangeFilter(filter)) {
    return orders;
  }

  return orders.flatMap((order) => {
    const filteredFills = order.fills.filter((fill) =>
      isFillWithinDateRange(fill.filledAt, filter),
    );

    if (filteredFills.length === 0) {
      return [];
    }

    const totalFillQuantity = filteredFills.reduce(
      (sum, fill) => sum + fill.quantity,
      0,
    );
    const totalFillValue = filteredFills.reduce(
      (sum, fill) => sum + fill.walletImpact.netValue,
      0,
    );

    return [
      {
        ...order,
        quantity: totalFillQuantity,
        filledQuantity: totalFillQuantity,
        value: totalFillValue,
        filledValue: totalFillValue,
        fills: filteredFills,
      },
    ];
  });
};

export {
  filterOrdersByFilledDateRange,
  hasFillDateRangeFilter,
};
export type { FillDateRangeFilter };
