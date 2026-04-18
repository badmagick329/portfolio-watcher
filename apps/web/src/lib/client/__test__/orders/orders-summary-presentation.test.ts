import { describe, expect, test } from 'vitest';

import {
  formatPriceAsOf,
  getCurrentPriceSourceLabel,
} from '../../orders/orders-summary-presentation';

describe('orders summary presentation', () => {
  test('maps effective price sources to human labels', () => {
    expect(getCurrentPriceSourceLabel('manual')).toBe('Manual override');
    expect(getCurrentPriceSourceLabel('stored', 'manual')).toBe(
      'Manual (saved)',
    );
    expect(getCurrentPriceSourceLabel('stored', 't212')).toBe('Trading 212');
    expect(getCurrentPriceSourceLabel('stored', 'eodhd')).toBe('EODHD');
    expect(getCurrentPriceSourceLabel('stored', 'fmp')).toBe('FMP');
    expect(getCurrentPriceSourceLabel('stored')).toBe('Stored');
    expect(getCurrentPriceSourceLabel('derived_from_fill')).toBe(
      'Derived from fill',
    );
    expect(getCurrentPriceSourceLabel(null)).toBe('n/a');
  });

  test('formats the price as-of timestamp into a friendly local string', () => {
    expect(formatPriceAsOf('2026-03-31T16:38:18.000Z')).not.toBe(
      '2026-03-31T16:38:18.000Z',
    );
    expect(formatPriceAsOf(undefined)).toBe('n/a');
  });
});
