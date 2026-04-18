import { describe, expect, test } from 'vitest';

import {
  getOrdersTablePaginationState,
  ORDERS_TABLE_PAGE_SIZE,
} from '../../orders/orders-table-pagination';

const createRows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
  }));

describe('orders table pagination', () => {
  test('page 1 shows the first 25 rows', () => {
    const pagination = getOrdersTablePaginationState(createRows(30), 1);

    expect(pagination.rows.map((row) => row.id)).toEqual(
      Array.from({ length: ORDERS_TABLE_PAGE_SIZE }, (_, index) => index + 1),
    );
    expect(pagination.totalPages).toBe(2);
    expect(pagination.pageRowsStart).toBe(1);
    expect(pagination.pageRowsEnd).toBe(25);
  });

  test('later pages show the correct row slice', () => {
    const pagination = getOrdersTablePaginationState(createRows(55), 3);

    expect(pagination.rows.map((row) => row.id)).toEqual([
      51, 52, 53, 54, 55,
    ]);
    expect(pagination.currentPage).toBe(3);
    expect(pagination.pageRowsStart).toBe(51);
    expect(pagination.pageRowsEnd).toBe(55);
  });

  test('out-of-range pages clamp safely', () => {
    const pagination = getOrdersTablePaginationState(createRows(30), 99);

    expect(pagination.currentPage).toBe(2);
    expect(pagination.rows.map((row) => row.id)).toEqual([26, 27, 28, 29, 30]);
  });

  test('empty rows produce no pages and no row range', () => {
    const pagination = getOrdersTablePaginationState([], 5);

    expect(pagination.totalPages).toBe(0);
    expect(pagination.currentPage).toBe(1);
    expect(pagination.pageRowsStart).toBe(0);
    expect(pagination.pageRowsEnd).toBe(0);
    expect(pagination.rows).toEqual([]);
  });
});
