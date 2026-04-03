import type { WebHistoricalOrder } from '@portfolio/domain';
import { endOfDay, format, startOfDay } from 'date-fns';

type FillDateRangeFilter = {
  filledFrom?: string;
  filledTo?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseQueryDate = (value?: string | null) => {
  if (!value || !DATE_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const formatQueryDate = (value: Date) => format(value, 'yyyy-MM-dd');

const getFillDateRangeFilterFromSearchParams = (
  searchParams: URLSearchParams | { get(name: string): string | null },
): FillDateRangeFilter => {
  const filledFrom = searchParams.get('filledFrom');
  const filledTo = searchParams.get('filledTo');

  return {
    filledFrom: parseQueryDate(filledFrom) ? filledFrom ?? undefined : undefined,
    filledTo: parseQueryDate(filledTo) ? filledTo ?? undefined : undefined,
  };
};

const getSearchParamsWithFillDateRange = (
  searchParams: URLSearchParams | { toString(): string },
  filter: FillDateRangeFilter,
) => {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  if (filter.filledFrom) {
    nextSearchParams.set('filledFrom', filter.filledFrom);
  } else {
    nextSearchParams.delete('filledFrom');
  }

  if (filter.filledTo) {
    nextSearchParams.set('filledTo', filter.filledTo);
  } else {
    nextSearchParams.delete('filledTo');
  }

  return nextSearchParams;
};

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
  formatQueryDate,
  getFillDateRangeFilterFromSearchParams,
  getSearchParamsWithFillDateRange,
  hasFillDateRangeFilter,
  parseQueryDate,
};
export type { FillDateRangeFilter };
