const ORDERS_TABLE_PAGE_SIZE = 25;

type OrdersTablePaginationState = {
  currentPage: number;
  endIndex: number;
  pageRowsStart: number;
  pageRowsEnd: number;
  pageSize: number;
  paginatedRowsCount: number;
  startIndex: number;
  totalPages: number;
  totalRows: number;
};

const getOrdersTablePaginationState = <
  TRow,
>(
  rows: TRow[],
  page: number,
): OrdersTablePaginationState & {
  rows: TRow[];
} => {
  const totalRows = rows.length;
  const totalPages =
    totalRows === 0 ? 0 : Math.ceil(totalRows / ORDERS_TABLE_PAGE_SIZE);
  const currentPage =
    totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
  const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * ORDERS_TABLE_PAGE_SIZE;
  const endIndex =
    totalRows === 0
      ? 0
      : Math.min(startIndex + ORDERS_TABLE_PAGE_SIZE, totalRows);
  const paginatedRows = rows.slice(startIndex, endIndex);
  const pageRowsStart = totalRows === 0 ? 0 : startIndex + 1;
  const pageRowsEnd = totalRows === 0 ? 0 : endIndex;

  return {
    currentPage,
    endIndex,
    pageRowsEnd,
    pageRowsStart,
    pageSize: ORDERS_TABLE_PAGE_SIZE,
    paginatedRowsCount: paginatedRows.length,
    rows: paginatedRows,
    startIndex,
    totalPages,
    totalRows,
  };
};

export { getOrdersTablePaginationState, ORDERS_TABLE_PAGE_SIZE };
export type { OrdersTablePaginationState };
