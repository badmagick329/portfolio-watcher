import { describe, expect, test } from 'vitest';
import { okAsync } from 'neverthrow';
import { createSetInstrumentCategories } from '../set-instrument-categories';
import { createUnsetInstrumentCategories } from '../unset-instrument-categories';

describe('bulk instrument categories', () => {
  test('sets normalized category for unique ISINs', async () => {
    const saved: Array<{ isin: string; category: string }> = [];
    const setInstrumentCategories = createSetInstrumentCategories({
      setInstrumentCategory: (isin, category) => {
        saved.push({ isin, category });
        return okAsync(undefined);
      },
    });

    const result = await setInstrumentCategories({
      isins: ['US0378331005', 'US5949181045', 'US0378331005'],
      category: ' Growth ',
    });

    expect(result.isOk()).toBe(true);
    expect(saved).toEqual([
      { isin: 'US0378331005', category: 'growth' },
      { isin: 'US5949181045', category: 'growth' },
    ]);
  });

  test('rejects empty ISIN list for set', async () => {
    const setInstrumentCategories = createSetInstrumentCategories({
      setInstrumentCategory: () => okAsync(undefined),
    });

    const result = await setInstrumentCategories({
      isins: [],
      category: 'growth',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Select at least one instrument.');
    }
  });

  test('rejects empty category for set', async () => {
    const setInstrumentCategories = createSetInstrumentCategories({
      setInstrumentCategory: () => okAsync(undefined),
    });

    const result = await setInstrumentCategories({
      isins: ['US0378331005'],
      category: ' ',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Category is required.');
    }
  });

  test('unsets unique ISINs', async () => {
    const removed: string[] = [];
    const unsetInstrumentCategories = createUnsetInstrumentCategories({
      unsetInstrumentCategory: (isin) => {
        removed.push(isin);
        return okAsync(undefined);
      },
    });

    const result = await unsetInstrumentCategories({
      isins: ['US0378331005', 'US5949181045', 'US0378331005'],
    });

    expect(result.isOk()).toBe(true);
    expect(removed).toEqual(['US0378331005', 'US5949181045']);
  });

  test('rejects empty ISIN list for unset', async () => {
    const unsetInstrumentCategories = createUnsetInstrumentCategories({
      unsetInstrumentCategory: () => okAsync(undefined),
    });

    const result = await unsetInstrumentCategories({ isins: [] });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Select at least one instrument.');
    }
  });
});
