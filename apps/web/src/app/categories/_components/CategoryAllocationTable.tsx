'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCategoryName } from '@/lib/client/categories/display-category';
import type { CategoryAllocationRow } from '@/lib/client/categories/instrument-category-allocation';
import {
  NA_LABEL,
  formatBeta,
  formatMoney,
  formatPercent,
} from '@/lib/client/presentation/format-values';
import { getSignedToneTextClassName } from '@/lib/client/presentation/presentation-tone';
import { SignedTableCell } from './SignedTableCell';

type CategoryAllocationTableProps = {
  hideValues: boolean;
  isHistorical: boolean;
  rows: CategoryAllocationRow[];
  showBeta: boolean;
  showAlpha: boolean;
};

function CategoryAllocationTable({
  hideValues,
  isHistorical,
  rows,
  showBeta,
  showAlpha,
}: CategoryAllocationTableProps) {
  return (
    <Table>
      <TableHeader>
        {isHistorical ? (
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Instruments</TableHead>
            <TableHead>Buys</TableHead>
            <TableHead>Sells</TableHead>
            <TableHead>Net invested</TableHead>
            <TableHead>P/L</TableHead>
            <TableHead>Return</TableHead>
            {showBeta ? <TableHead>Beta</TableHead> : null}
            {showAlpha ? <TableHead>Alpha</TableHead> : null}
          </TableRow>
        ) : (
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Holdings</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Allocation</TableHead>
            {showBeta ? <TableHead>Beta</TableHead> : null}
            {showAlpha ? <TableHead>Alpha</TableHead> : null}
            <TableHead>P/L</TableHead>
            <TableHead>Return</TableHead>
          </TableRow>
        )}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.category}>
            {isHistorical ? (
              <>
                <TableCell>{formatCategoryName(row.category)}</TableCell>
                <TableCell>{row.holdingCount}</TableCell>
                <TableCell>
                  {formatMoney(row.buyCost ?? 0, { hideValues })}
                </TableCell>
                <TableCell>
                  {formatMoney(row.sellProceeds ?? 0, { hideValues })}
                </TableCell>
                <SignedTableCell
                  formatter={(value) => formatMoney(value, { hideValues })}
                  value={row.netInvested ?? 0}
                />
                <SignedTableCell
                  formatter={(value) => formatMoney(value, { hideValues })}
                  value={row.unrealizedPnl}
                />
                <SignedTableCell
                  formatter={formatPercent}
                  value={row.returnPercent}
                />
                {showBeta ? (
                  <TableCell>
                    {row.beta === null ? NA_LABEL : formatBeta(row.beta)}
                  </TableCell>
                ) : null}
                {showAlpha ? (
                  <SignedTableCell
                    formatter={formatPercent}
                    value={row.alpha}
                  />
                ) : null}
              </>
            ) : (
              <>
                <TableCell>{formatCategoryName(row.category)}</TableCell>
                <TableCell>{row.holdingCount}</TableCell>
                <TableCell>
                  {formatMoney(row.currentValue, { hideValues })}
                </TableCell>
                <TableCell>{formatPercent(row.allocationPercent)}</TableCell>
                {showBeta ? (
                  <TableCell>
                    {row.beta === null ? NA_LABEL : formatBeta(row.beta)}
                  </TableCell>
                ) : null}
                {showAlpha ? (
                  <SignedTableCell
                    formatter={formatPercent}
                    value={row.alpha}
                  />
                ) : null}
                <TableCell>
                  <ConsolidatedPnlCell
                    hideValues={hideValues}
                    realizedPnl={row.realizedPnl}
                    unrealizedPnl={row.unrealizedPnl}
                  />
                </TableCell>
                <SignedTableCell
                  formatter={formatPercent}
                  value={row.returnPercent}
                />
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ConsolidatedPnlCell({
  hideValues,
  realizedPnl,
  unrealizedPnl,
}: {
  hideValues: boolean;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
}) {
  const totalPnl =
    realizedPnl === null && unrealizedPnl === null
      ? null
      : (realizedPnl ?? 0) + (unrealizedPnl ?? 0);

  if (totalPnl === null) {
    return NA_LABEL;
  }

  return (
    <div className='flex flex-col gap-1'>
      <div className={`text-sm ${getSignedToneTextClassName(totalPnl)}`}>
        {formatMoney(totalPnl, { hideValues })}
      </div>
      <div className='flex flex-wrap gap-x-4 text-xs text-muted-foreground'>
        <span>
          <span className='text-muted-foreground/80'>R</span>{' '}
          <span>{formatMoney(realizedPnl ?? 0, { hideValues })}</span>
        </span>
        <span>
          <span className='text-muted-foreground/80'>U</span>{' '}
          <span>{formatMoney(unrealizedPnl ?? 0, { hideValues })}</span>
        </span>
      </div>
    </div>
  );
}

export { CategoryAllocationTable };
