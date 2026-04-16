import { describe, expect, test } from 'vitest';
import { parseCategoriesArgs } from '../categories-cli';

describe('parseCategoriesArgs', () => {
  test('accepts a valid set command and normalizes category', () => {
    const result = parseCategoriesArgs([
      'set',
      '--instrument',
      'AAPL',
      '--category',
      ' Growth ',
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'set',
        value: {
          instrument: 'AAPL',
          category: 'growth',
        },
      });
    }
  });

  test('rejects set without category', () => {
    const result = parseCategoriesArgs(['set', '--instrument', 'AAPL']);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('The --category flag is required.');
    }
  });

  test('accepts a valid unset command', () => {
    const result = parseCategoriesArgs(['unset', '--instrument', 'AAPL']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'unset',
        value: {
          instrument: 'AAPL',
        },
      });
    }
  });

  test('parses include and exclude comma lists', () => {
    const result = parseCategoriesArgs([
      'list',
      '--include',
      ' Growth,defensive,growth ',
      '--exclude',
      'metals,',
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'list',
        value: {
          includeCategories: ['growth', 'defensive'],
          excludeCategories: ['metals'],
        },
      });
    }
  });

  test('rejects overlapping include and exclude categories', () => {
    const result = parseCategoriesArgs([
      'list',
      '--include',
      'growth,defensive',
      '--exclude',
      'metals,growth',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Category "growth" cannot be both included and excluded.',
      );
    }
  });

  test('rejects unknown flags', () => {
    const result = parseCategoriesArgs(['list', '--wat', 'value']);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Unknown flag: --wat.');
    }
  });
});
