'use client';

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
import type { MoversTableViewModel } from '@/lib/client/movers/current-holding-movers';
import {
  formatMoney,
  formatPercent,
} from '@/lib/client/presentation/format-values';
import { getSignedToneTextClassName } from '@/lib/client/presentation/presentation-tone';
import { cn } from '@/lib/utils';

type MoversTableProps = {
  hideValues: boolean;
  onPageChange: (page: number) => void;
  title: string;
  viewModel: MoversTableViewModel;
};

function MoversTable({
  hideValues,
  onPageChange,
  title,
  viewModel,
}: MoversTableProps) {
  return (
    <section className='flex min-w-0 flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='font-mono text-lg'>{title}</h2>
        <p className='text-xs text-muted-foreground'>
          {viewModel.totalRows} row{viewModel.totalRows === 1 ? '' : 's'}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Instrument</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className='text-right'>Avg cost</TableHead>
            <TableHead className='text-right'>Start price</TableHead>
            <TableHead className='text-right'>End price</TableHead>
            <TableHead className='text-right'>% change</TableHead>
            <TableHead className='text-right'>Change</TableHead>
            <TableHead className='text-right'>P/L impact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viewModel.rows.length === 0 ? (
            <TableRow>
              <TableCell
                className='text-sm text-muted-foreground'
                colSpan={8}
              >
                No rows.
              </TableCell>
            </TableRow>
          ) : (
            viewModel.rows.map((row) => (
              <TableRow key={row.instrument.isin}>
                <TableCell>
                  <div className='flex max-w-56 flex-col whitespace-normal'>
                    <span className='font-medium'>{row.instrument.ticker}</span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {row.instrument.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{row.instrument.category ?? 'Uncategorized'}</TableCell>
                <TableCell className='text-right'>
                  {row.position.averagePricePaid == null
                    ? '—'
                    : formatMoney(row.position.averagePricePaid, { hideValues })}
                </TableCell>
                <TableCell className='text-right'>
                  {formatMoney(row.startPrice.price, { hideValues })}
                </TableCell>
                <TableCell className='text-right'>
                  {formatMoney(row.endPrice.price, { hideValues })}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right',
                    getSignedToneTextClassName(row.returnPercent),
                  )}
                >
                  {formatPercent(row.returnPercent)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right',
                    getSignedToneTextClassName(row.priceChange),
                  )}
                >
                  {formatMoney(row.priceChange, { hideValues })}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right',
                    getSignedToneTextClassName(row.walletImpact),
                  )}
                >
                  {formatMoney(row.walletImpact, { hideValues })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination>
        <PaginationContent>
          <PaginationButton
            direction='previous'
            disabled={viewModel.page <= 1}
            onClick={() => onPageChange(viewModel.page - 1)}
            type='button'
          >
            Previous
          </PaginationButton>
          <PaginationInfo>
            Page {viewModel.page} of {viewModel.totalPages}
          </PaginationInfo>
          <PaginationButton
            direction='next'
            disabled={viewModel.page >= viewModel.totalPages}
            onClick={() => onPageChange(viewModel.page + 1)}
            type='button'
          >
            Next
          </PaginationButton>
        </PaginationContent>
      </Pagination>
    </section>
  );
}

export { MoversTable };
