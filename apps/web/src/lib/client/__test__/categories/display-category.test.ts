import { describe, expect, test } from 'vitest';
import { formatCategoryName } from '../../categories/display-category';

describe('formatCategoryName', () => {
  test('trims and title-cases category names for display', () => {
    expect(formatCategoryName(' index ')).toBe('Index');
    expect(formatCategoryName('TECH STOCKS')).toBe('Tech Stocks');
  });

  test('uses a dash for empty categories', () => {
    expect(formatCategoryName(null)).toBe('-');
    expect(formatCategoryName('   ')).toBe('-');
  });

  test('truncates long category names', () => {
    expect(formatCategoryName('a'.repeat(60))).toBe(
      `A${'a'.repeat(46)}...`,
    );
  });
});
