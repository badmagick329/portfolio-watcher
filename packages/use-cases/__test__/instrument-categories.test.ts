import { describe, expect, test } from 'vitest';
import type {
  CategorizedInstrument,
  InstrumentCategoryFilter,
  InstrumentCategoryInstrument,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createListCategorizedInstruments } from '../list-categorized-instruments';
import { createSetInstrumentCategory } from '../set-instrument-category';
import { createUnsetInstrumentCategory } from '../unset-instrument-category';

const apple: InstrumentCategoryInstrument = {
  ticker: 'AAPL_US_EQ',
  name: 'Apple Inc.',
  isin: 'US0378331005',
  currency: 'USD',
};

const microsoft: InstrumentCategoryInstrument = {
  ticker: 'MSFT_US_EQ',
  name: 'Microsoft Corporation',
  isin: 'US5949181045',
  currency: 'USD',
};

describe('instrument categories', () => {
  test('set resolves a local ticker and stores a normalized category', async () => {
    let saved: { isin: string; category: string } | undefined;

    const setInstrumentCategory = createSetInstrumentCategory({
      findInstrumentCategoryInstrumentMatches: () => okAsync([apple]),
      setInstrumentCategory: (isin, category) => {
        saved = { isin, category };
        return okAsync(undefined);
      },
    });

    const result = await setInstrumentCategory({
      instrument: 'AAPL',
      category: ' Growth ',
    });

    expect(result.isOk()).toBe(true);
    expect(saved).toEqual({
      isin: 'US0378331005',
      category: 'growth',
    });
  });

  test('set resolves a local ISIN', async () => {
    let receivedInput = '';

    const setInstrumentCategory = createSetInstrumentCategory({
      findInstrumentCategoryInstrumentMatches: (input) => {
        receivedInput = input;
        return okAsync([apple]);
      },
      setInstrumentCategory: () => okAsync(undefined),
    });

    const result = await setInstrumentCategory({
      instrument: 'US0378331005',
      category: 'tech',
    });

    expect(result.isOk()).toBe(true);
    expect(receivedInput).toBe('US0378331005');
  });

  test('set rejects an invalid local instrument', async () => {
    const setInstrumentCategory = createSetInstrumentCategory({
      findInstrumentCategoryInstrumentMatches: () => okAsync([]),
      setInstrumentCategory: () => okAsync(undefined),
    });

    const result = await setInstrumentCategory({
      instrument: 'NOPE',
      category: 'growth',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('No local instrument matched "NOPE".');
    }
  });

  test('unset resolves and removes category by ISIN', async () => {
    let removedIsin: string | undefined;

    const unsetInstrumentCategory = createUnsetInstrumentCategory({
      findInstrumentCategoryInstrumentMatches: () => okAsync([apple]),
      unsetInstrumentCategory: (isin) => {
        removedIsin = isin;
        return okAsync(undefined);
      },
    });

    const result = await unsetInstrumentCategory({ instrument: 'AAPL' });

    expect(result.isOk()).toBe(true);
    expect(removedIsin).toBe('US0378331005');
  });

  test('list normalizes filters and rejects overlapping categories', async () => {
    let receivedFilters: InstrumentCategoryFilter | undefined;

    const listCategorizedInstruments = createListCategorizedInstruments({
      listCategorizedInstruments: (filters = {}) => {
        receivedFilters = filters;
        return okAsync([]);
      },
    });

    const result = await listCategorizedInstruments({
      includeCategories: [' Growth ', 'defensive', 'growth'],
      excludeCategories: ['metals'],
    });

    expect(result.isOk()).toBe(true);
    expect(receivedFilters).toEqual({
      includeCategories: ['growth', 'defensive'],
      excludeCategories: ['metals'],
    });

    const overlap = await listCategorizedInstruments({
      includeCategories: ['growth'],
      excludeCategories: [' Growth '],
    });

    expect(overlap.isErr()).toBe(true);
    if (overlap.isErr()) {
      expect(overlap.error.message).toBe(
        'Category "growth" cannot be both included and excluded.',
      );
    }
  });

  test('list returns data manager rows unchanged after valid filters', async () => {
    const rows: CategorizedInstrument[] = [
      { ...apple, category: 'growth' },
      { ...microsoft, category: null },
    ];

    const listCategorizedInstruments = createListCategorizedInstruments({
      listCategorizedInstruments: () => okAsync(rows),
    });

    const result = await listCategorizedInstruments({
      excludeCategories: ['defensive'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(rows);
    }
  });
});
