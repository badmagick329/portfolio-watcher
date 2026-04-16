import { describe, expect, test } from 'vitest';
import type { BrokerDataManager } from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createGetLatestInstrumentPrice } from '../get-latest-instrument-price';

describe('getLatestInstrumentPrice', () => {
  test('returns the latest stored price from the data manager', async () => {
    const dataManager: BrokerDataManager = {
      saveHistoricalOrders: () => okAsync(0),
      getHistoricalOrders: () => okAsync([]),
      getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
      getDistinctInstruments: () => okAsync([]),
      saveInstrumentPriceSnapshot: () => okAsync(undefined),
      saveCurrentPositionSnapshot: () => okAsync(undefined),
      getLatestCurrentPositionSnapshotByIsin: () => okAsync(undefined),
      saveAccountSummarySnapshot: () => okAsync(undefined),
      getLatestAccountSummarySnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: (isin: string) =>
        okAsync({
          isin,
          provider: 'fmp',
          providerSymbol: 'AMD',
          currency: 'USD',
          price: 123.45,
          priceType: 'eod',
          asOf: '2026-03-24',
          fetchedAt: '2026-03-25T12:00:00.000Z',
        }),
      saveOrderExecutionAttempt: () => okAsync(undefined),
      saveT212InstrumentCatalogItems: () => okAsync(0),
      findT212InstrumentCatalogMatches: () => okAsync([]),
      findInstrumentCategoryInstrumentMatches: () => okAsync([]),
      setInstrumentCategory: () => okAsync(undefined),
      unsetInstrumentCategory: () => okAsync(undefined),
      setInstrumentCategories: () => okAsync(undefined),
      unsetInstrumentCategories: () => okAsync(undefined),
      listCategorizedInstruments: () => okAsync([]),
    };

    const getLatestInstrumentPrice = createGetLatestInstrumentPrice(dataManager);
    const result = await getLatestInstrumentPrice('US0079031078');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value?.price).toBe(123.45);
    }
  });
});
