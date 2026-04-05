import { describe, expect, test } from 'vitest';
import { parsePlaceOrderArgs } from '../place-order-cli';

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
