import { describe, expect, test } from 'vitest';
import type { BrokerDataManager, WebHistoricalOrdersFilters } from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createGetHistoricalOrdersForWeb } from '../get-historical-orders-for-web';

describe('getHistoricalOrdersForWeb', () => {
  test('forwards filters to the data manager and returns its wrapper shape', async () => {
    const filters: WebHistoricalOrdersFilters = {
      ticker: 'AAPL',
      createdFrom: '2024-01-01T00:00:00Z',
      filledTo: '2024-12-31T23:59:59Z',
    };

    let receivedFilters: WebHistoricalOrdersFilters | undefined;

    const dataManager: BrokerDataManager = {
      saveHistoricalOrders: () => okAsync(0),
      getHistoricalOrders: () => okAsync([]),
      getDistinctInstruments: () => okAsync([]),
      saveInstrumentPriceSource: () => okAsync(undefined),
      getInstrumentPriceSourceByIsin: () => okAsync(undefined),
      saveInstrumentPriceSnapshot: () => okAsync(undefined),
      saveCurrentPositionSnapshot: () => okAsync(undefined),
      getLatestCurrentPositionSnapshotByIsin: () => okAsync(undefined),
      saveAccountSummarySnapshot: () => okAsync(undefined),
      getLatestAccountSummarySnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: () => okAsync(undefined),
      listInstrumentsNeedingPriceRefresh: () => okAsync([]),
      getHistoricalOrdersForWeb: (input = {}) => {
        receivedFilters = input;

        return okAsync({
          items: [
            {
              id: 1,
              strategy: 'MANUAL',
              type: 'LIMIT',
              ticker: 'AAPL',
              quantity: 2,
              filledQuantity: 2,
              value: 200,
              filledValue: 200,
              limitPrice: 100,
              status: 'FILLED',
              currency: 'USD',
              extendedHours: false,
              initiatedFrom: 'WEB',
              side: 'BUY',
              createdAt: '2024-01-02T10:00:00Z',
              instrument: {
                ticker: 'AAPL',
                name: 'Apple Inc.',
                isin: 'US0378331005',
                currency: 'USD',
              },
              fills: [],
            },
          ],
          filters: input,
        });
      },
    };

    const getHistoricalOrdersForWeb = createGetHistoricalOrdersForWeb(dataManager);
    const result = await getHistoricalOrdersForWeb(filters);

    expect(receivedFilters).toEqual(filters);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        items: [
          {
            id: 1,
            strategy: 'MANUAL',
            type: 'LIMIT',
            ticker: 'AAPL',
            quantity: 2,
            filledQuantity: 2,
            value: 200,
            filledValue: 200,
            limitPrice: 100,
            status: 'FILLED',
            currency: 'USD',
            extendedHours: false,
            initiatedFrom: 'WEB',
            side: 'BUY',
            createdAt: '2024-01-02T10:00:00Z',
            instrument: {
              ticker: 'AAPL',
              name: 'Apple Inc.',
              isin: 'US0378331005',
              currency: 'USD',
            },
            fills: [],
          },
        ],
        filters,
      });
    }
  });
});
