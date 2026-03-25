import { describe, expect, test } from 'vitest';
import type { BrokerDataManager } from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createGetDistinctInstruments } from '../get-distinct-instruments';

describe('getDistinctInstruments', () => {
  test('calls the data manager and returns its wrapper shape unchanged', async () => {
    let calls = 0;

    const instruments = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        currency: 'USD',
      },
      {
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        isin: 'US5949181045',
        currency: 'USD',
      },
    ];

    const dataManager: BrokerDataManager = {
      saveHistoricalOrders: () => okAsync(0),
      getHistoricalOrders: () => okAsync([]),
      getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
      getDistinctInstruments: () => {
        calls++;
        return okAsync(instruments);
      },
      saveInstrumentPriceSource: () => okAsync(undefined),
      getInstrumentPriceSourceByIsin: () => okAsync(undefined),
      saveInstrumentPriceSnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: () => okAsync(undefined),
      listInstrumentsNeedingPriceRefresh: () => okAsync([]),
    };

    const getDistinctInstruments = createGetDistinctInstruments(dataManager);
    const result = await getDistinctInstruments();

    expect(calls).toBe(1);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(instruments);
    }
  });
});
