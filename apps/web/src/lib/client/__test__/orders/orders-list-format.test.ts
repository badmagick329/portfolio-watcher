import { describe, expect, test } from 'vitest';

import {
  formatInstrumentPrice,
  formatPercentage,
  formatPrivateQuantity,
  formatSignedCurrencyAmount,
  formatUnsignedCurrencyAmount,
} from '../../orders/orders-list-format';

describe('orders list format', () => {
  test('keeps visible currency formatting unchanged', () => {
    expect(formatSignedCurrencyAmount(12.3, 'GBP')).toBe('+12.30 GBP');
    expect(formatSignedCurrencyAmount(-12.3, 'GBP')).toBe('-12.30 GBP');
    expect(formatUnsignedCurrencyAmount(12.3, 'GBP')).toBe('12.30 GBP');
    expect(formatInstrumentPrice(12.3456, 'GBP')).toBe('12.346 GBP');
    expect(formatPrivateQuantity(12.34567)).toBe('12.3457');
  });

  test('masks currency and price values when hidden', () => {
    expect(formatSignedCurrencyAmount(12.3, 'GBP', { hideValues: true })).toBe(
      '+•••• GBP',
    );
    expect(formatSignedCurrencyAmount(-12.3, 'GBP', { hideValues: true })).toBe(
      '-•••• GBP',
    );
    expect(formatUnsignedCurrencyAmount(12.3, 'GBP', { hideValues: true })).toBe(
      '•••• GBP',
    );
    expect(formatInstrumentPrice(12.3456, 'GBP', 3, { hideValues: true })).toBe(
      '•••• GBP',
    );
    expect(formatPrivateQuantity(12.34567, { hideValues: true })).toBe('••••');
  });

  test('keeps percentages and unavailable values readable', () => {
    expect(formatPercentage(0.1234)).toBe('+12.34%');
    expect(formatSignedCurrencyAmount(null, 'GBP', { hideValues: true })).toBe(
      'n/a GBP',
    );
    expect(formatInstrumentPrice(null, 'GBP', 3, { hideValues: true })).toBe(
      'n/a',
    );
    expect(formatPrivateQuantity(null, { hideValues: true })).toBe('n/a');
  });
});
