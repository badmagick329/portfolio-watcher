'use client';

import { TableCell } from '@/components/ui/table';
import { NA_LABEL } from '@/lib/client/format-values';
import { getSignedToneTextClassName } from '@/lib/client/presentation-tone';

type SignedTableCellProps = {
  fallback?: string;
  formatter: (value: number) => string;
  value: number | null | undefined;
};

function SignedTableCell({
  fallback = NA_LABEL,
  formatter,
  value,
}: SignedTableCellProps) {
  return (
    <TableCell className={getSignedToneTextClassName(value)}>
      {value === null || value === undefined ? fallback : formatter(value)}
    </TableCell>
  );
}

export { SignedTableCell };
