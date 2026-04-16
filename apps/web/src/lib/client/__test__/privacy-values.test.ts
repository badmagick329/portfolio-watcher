import { describe, expect, test } from 'vitest';

import {
  formatHiddenCurrencyAmount,
  formatHiddenMoney,
  formatHiddenSignedCurrencyAmount,
  getHideValuesFromSearchParams,
  getSearchParamsWithHideValues,
} from '../privacy-values';

describe('privacy values', () => {
  test('parses hide values from search params', () => {
    expect(
      getHideValuesFromSearchParams(new URLSearchParams('hideValues=1')),
    ).toBe(true);
    expect(
      getHideValuesFromSearchParams(new URLSearchParams('hideValues=true')),
    ).toBe(false);
    expect(getHideValuesFromSearchParams(new URLSearchParams())).toBe(false);
  });

  test('updates hide values while preserving unrelated params', () => {
    expect(
      getSearchParamsWithHideValues(
        new URLSearchParams('mode=allocation'),
        true,
      ).toString(),
    ).toBe('mode=allocation&hideValues=1');
    expect(
      getSearchParamsWithHideValues(
        new URLSearchParams('mode=allocation&hideValues=1'),
        false,
      ).toString(),
    ).toBe('mode=allocation');
  });

  test('formats hidden values', () => {
    expect(formatHiddenCurrencyAmount('GBP')).toBe('•••• GBP');
    expect(formatHiddenSignedCurrencyAmount(12, 'GBP')).toBe('+•••• GBP');
    expect(formatHiddenSignedCurrencyAmount(-12, 'GBP')).toBe('-•••• GBP');
    expect(formatHiddenSignedCurrencyAmount(null, 'GBP')).toBe('n/a GBP');
    expect(formatHiddenMoney(12)).toBe('£••••');
    expect(formatHiddenMoney(-12)).toBe('-£••••');
    expect(formatHiddenMoney(null)).toBe('n/a');
  });
});
