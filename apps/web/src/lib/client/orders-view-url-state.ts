const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type OrdersViewMode = 'all' | 'include' | 'exclude';

type OrdersViewUrlState = {
  mode: OrdersViewMode;
  selectedIsins: string[];
  filledFrom?: string;
  filledTo?: string;
  page: number;
};

const DEFAULT_ORDERS_VIEW_URL_STATE: OrdersViewUrlState = {
  mode: 'include',
  selectedIsins: [],
  page: 1,
};

const isOrdersViewMode = (value: string | null): value is OrdersViewMode =>
  value === 'all' || value === 'include' || value === 'exclude';

const parseQueryDate = (value?: string | null) => {
  if (!value || !DATE_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
};

const formatQueryDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getNormalizedSelectedIsins = (value: string | null) =>
  Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const getNormalizedPage = (value: string | null) => {
  if (!value) {
    return DEFAULT_ORDERS_VIEW_URL_STATE.page;
  }

  const parsedPage = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return DEFAULT_ORDERS_VIEW_URL_STATE.page;
  }

  return parsedPage;
};

const getOrdersViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null },
): OrdersViewUrlState => {
  const mode = searchParams.get('mode');
  const filledFrom = searchParams.get('filledFrom');
  const filledTo = searchParams.get('filledTo');

  return {
    mode: isOrdersViewMode(mode) ? mode : DEFAULT_ORDERS_VIEW_URL_STATE.mode,
    selectedIsins: getNormalizedSelectedIsins(searchParams.get('isins')),
    filledFrom: parseQueryDate(filledFrom) ? filledFrom ?? undefined : undefined,
    filledTo: parseQueryDate(filledTo) ? filledTo ?? undefined : undefined,
    page: getNormalizedPage(searchParams.get('page')),
  };
};

const getSearchParamsWithOrdersViewUrlState = (
  searchParams: URLSearchParams | { toString(): string },
  state: OrdersViewUrlState,
) => {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  nextSearchParams.set('mode', state.mode);

  if (state.selectedIsins.length > 0) {
    nextSearchParams.set('isins', state.selectedIsins.join(','));
  } else {
    nextSearchParams.delete('isins');
  }

  if (state.filledFrom) {
    nextSearchParams.set('filledFrom', state.filledFrom);
  } else {
    nextSearchParams.delete('filledFrom');
  }

  if (state.filledTo) {
    nextSearchParams.set('filledTo', state.filledTo);
  } else {
    nextSearchParams.delete('filledTo');
  }

  nextSearchParams.set('page', `${state.page}`);

  return nextSearchParams;
};

const getSearchParamsWithUpdatedOrdersViewUrlState = (
  searchParams: URLSearchParams | { get(name: string): string | null; toString(): string },
  partialState: Partial<OrdersViewUrlState>,
) =>
  getSearchParamsWithOrdersViewUrlState(searchParams, {
    ...getOrdersViewUrlState(searchParams),
    ...partialState,
  });

export {
  DEFAULT_ORDERS_VIEW_URL_STATE,
  formatQueryDate,
  getOrdersViewUrlState,
  getSearchParamsWithOrdersViewUrlState,
  getSearchParamsWithUpdatedOrdersViewUrlState,
  parseQueryDate,
};
export type { OrdersViewMode, OrdersViewUrlState };
