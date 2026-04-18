import { describe, expect, test } from 'vitest';

import {
  formatBeta,
  formatMoney,
  formatPercent,
  NA_LABEL,
} from '@/lib/client/format-values';

describe('format-values', () => {
  test('formats GBP money', () => {
    expect(formatMoney(1234.567)).toBe('£1,234.57');
  });

  test('formats hidden money with existing privacy output', () => {
    expect(formatMoney(-12, { hideValues: true })).toBe('-£••••');
  });

  test('formats percent values', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
  });

  test('formats beta values', () => {
    expect(formatBeta(1.234)).toBe('1.23');
  });

  test('exports the shared n/a label', () => {
    expect(NA_LABEL).toBe('n/a');
  });
});
