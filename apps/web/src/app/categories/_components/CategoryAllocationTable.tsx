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
import { SignedTableCell } from './SignedTableCell';

type CategoryAllocationTableProps = {
  hideValues: boolean;
  isHistorical: boolean;
  rows: CategoryAllocationRow[];
};

function CategoryAllocationTable({
  hideValues,
  isHistorical,
  rows,
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
            <TableHead>Beta</TableHead>
            <TableHead>Alpha</TableHead>
          </TableRow>
        ) : (
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Holdings</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Allocation</TableHead>
            <TableHead>Beta</TableHead>
            <TableHead>Alpha</TableHead>
            <TableHead>Unrealized P/L</TableHead>
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
                <TableCell>
                  {row.beta === null ? NA_LABEL : formatBeta(row.beta)}
                </TableCell>
                <SignedTableCell formatter={formatPercent} value={row.alpha} />
              </>
            ) : (
              <>
                <TableCell>{formatCategoryName(row.category)}</TableCell>
                <TableCell>{row.holdingCount}</TableCell>
                <TableCell>
                  {formatMoney(row.currentValue, { hideValues })}
                </TableCell>
                <TableCell>{formatPercent(row.allocationPercent)}</TableCell>
                <TableCell>
                  {row.beta === null ? NA_LABEL : formatBeta(row.beta)}
                </TableCell>
                <SignedTableCell formatter={formatPercent} value={row.alpha} />
                <SignedTableCell
                  formatter={(value) => formatMoney(value, { hideValues })}
                  value={row.unrealizedPnl}
                />
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

export { CategoryAllocationTable };
