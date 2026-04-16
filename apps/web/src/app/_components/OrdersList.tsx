'use client';

import { useEffect } from 'react';

import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationInfo,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '@/lib/client/instrument-price';
import { buildOrdersListRows } from '@/lib/client/orders-list-rows';
import { getOrdersTablePaginationState } from '@/lib/client/orders-table-pagination';
import { getCurrentTimeZoneAbbreviation } from '@/lib/client/orders-summary-presentation';
import { useOrdersSummaryController } from '@/lib/client/useOrdersSummaryController';
import type { WebHistoricalOrder } from '@portfolio/domain';
import { OrdersSummary } from './OrdersSummary';

type OrdersListProps = {
  currentPage: number;
  hasActiveFillDateFilter: boolean;
  hideValues: boolean;
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
  onPageChange: (page: number) => void;
  selectionMode: 'all' | 'single' | 'include' | 'exclude';
  selectedInstruments: InstrumentWithStoredPrice[];
};

export function OrdersList({
  currentPage,
  hasActiveFillDateFilter,
  hideValues,
  latestAccountSummarySnapshot,
  orders,
  onPageChange,
  selectionMode,
  selectedInstruments,
}: OrdersListProps) {
  const rows = buildOrdersListRows(orders, { hideValues });
  const pagination = getOrdersTablePaginationState(rows, currentPage);
  const timeColumnLabel = `Time (${getCurrentTimeZoneAbbreviation()})`;
  const { viewModel, actions } = useOrdersSummaryController({
    hasActiveFillDateFilter,
    latestAccountSummarySnapshot,
    orders,
    selectionMode,
    selectedInstruments,
  });

  useEffect(() => {
    if (pagination.totalPages > 0 && pagination.currentPage !== currentPage) {
      onPageChange(pagination.currentPage);
    }
  }, [currentPage, onPageChange, pagination.currentPage, pagination.totalPages]);

  return (
    <div className='flex w-full flex-col items-center gap-4'>
      <OrdersSummary
        actions={actions}
        hideValues={hideValues}
        viewModel={viewModel}
      />

      <div className='w-full overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{timeColumnLabel}</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.instrumentName}</TableCell>
                <TableCell>{row.side}</TableCell>
                <TableCell>{row.quantityDisplay}</TableCell>
                <TableCell>{row.priceDisplay}</TableCell>
                <TableCell>{row.amountDisplay}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 ? (
        <Pagination className='w-full'>
          <PaginationContent className='flex-col items-start gap-2 sm:flex-row sm:items-center'>
            <PaginationInfo>
              Showing {pagination.pageRowsStart}-{pagination.pageRowsEnd} of{' '}
              {pagination.totalRows}
            </PaginationInfo>
            <div className='flex items-center gap-2 self-end sm:self-auto'>
              <PaginationButton
                direction='previous'
                disabled={pagination.currentPage <= 1}
                onClick={() => onPageChange(pagination.currentPage - 1)}
                type='button'
              >
                Previous
              </PaginationButton>
              <PaginationInfo className='min-w-20 text-center'>
                Page {pagination.currentPage} of {pagination.totalPages}
              </PaginationInfo>
              <PaginationButton
                direction='next'
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => onPageChange(pagination.currentPage + 1)}
                type='button'
              >
                Next
              </PaginationButton>
            </div>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
