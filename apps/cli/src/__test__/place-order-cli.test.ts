import { describe, expect, test } from 'vitest';
import { parsePlaceLimitOrderArgs, parsePlaceOrderArgs } from '../place-order-cli';

describe('parsePlaceOrderArgs', () => {
  test('rejects a missing instrument', () => {
    const result = parsePlaceOrderArgs(['--side', 'buy', '--quantity', '1']);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('The --instrument flag is required.');
    }
  });

  test('rejects a missing side', () => {
    const result = parsePlaceOrderArgs(['--instrument', 'AAPL', '--quantity', '1']);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'The --side flag must be either "buy" or "sell".',
      );
    }
  });

  test('rejects providing both quantity and value', () => {
    const result = parsePlaceOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
      '--quantity',
      '1',
      '--value',
      '100',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Provide exactly one of --quantity or --value.',
      );
    }
  });

  test('rejects providing neither quantity nor value', () => {
    const result = parsePlaceOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Provide exactly one of --quantity or --value.',
      );
    }
  });
});

describe('parsePlaceLimitOrderArgs', () => {
  test('accepts a valid limit order', () => {
    const result = parsePlaceLimitOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
      '--quantity',
      '1',
      '--limit-price',
      '100.23',
      '--confirm',
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        instrument: 'AAPL',
        side: 'buy',
        quantity: 1,
        limitPrice: 100.23,
        confirm: true,
      });
    }
  });

  test('rejects a missing limit price', () => {
    const result = parsePlaceLimitOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
      '--quantity',
      '1',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'The --limit-price flag must be a positive number.',
      );
    }
  });

  test('rejects value mode', () => {
    const result = parsePlaceLimitOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
      '--value',
      '100',
      '--limit-price',
      '100.23',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'The --value flag is not supported for limit orders.',
      );
    }
  });

  test('rejects extended hours', () => {
    const result = parsePlaceLimitOrderArgs([
      '--instrument',
      'AAPL',
      '--side',
      'buy',
      '--quantity',
      '1',
      '--limit-price',
      '100.23',
      '--extended-hours',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'The --extended-hours flag is not supported for limit orders.',
      );
    }
  });
});
