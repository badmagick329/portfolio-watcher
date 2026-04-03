import { describe, expect, test } from 'vitest';

import {
  formatPriceAsOf,
  getCurrentPriceSourceLabel,
  METRIC_HELP_TEXT,
} from '../orders-summary-presentation';

describe('orders summary presentation', () => {
  test('maps effective price sources to human labels', () => {
    expect(getCurrentPriceSourceLabel('manual')).toBe('Manual');
    expect(getCurrentPriceSourceLabel('stored')).toBe('Stored');
    expect(getCurrentPriceSourceLabel('derived_from_fill')).toBe(
      'Derived from fill',
    );
    expect(getCurrentPriceSourceLabel(null)).toBe('n/a');
  });

  test('defines help text for the finance terms we annotate', () => {
    expect(METRIC_HELP_TEXT.averageCost).toContain('Weighted average');
    expect(METRIC_HELP_TEXT.costBasis).toContain('shares you still hold');
    expect(METRIC_HELP_TEXT.unrealizedPnL).toContain('Current value');
    expect(METRIC_HELP_TEXT.netCashflow).toContain('Historical money');
    expect(METRIC_HELP_TEXT.priceOverride).toContain('Save stores');
  });

  test('formats the price as-of timestamp into a friendly local string', () => {
    expect(formatPriceAsOf('2026-03-31T16:38:18.000Z')).not.toBe(
      '2026-03-31T16:38:18.000Z',
    );
    expect(formatPriceAsOf(undefined)).toBe('n/a');
  });
});
