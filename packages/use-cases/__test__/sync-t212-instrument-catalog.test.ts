import { describe, expect, test, vi } from 'vitest';
import type {
  BrokerClient,
  BrokerDataManager,
  T212InstrumentCatalogItem,
  T212InstrumentMetadataItem,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createSyncT212InstrumentCatalog } from '../sync-t212-instrument-catalog';

describe('syncT212InstrumentCatalog', () => {
  test('persists the fetched instrument metadata as catalog items', async () => {
    const fetchInstrumentsMetadata = vi.fn(() =>
      okAsync([
        {
          ticker: 'AAPL_US_EQ',
          isin: 'US0378331005',
          name: 'Apple',
          shortName: 'Apple',
          type: 'STOCK',
          currencyCode: 'USD',
          extendedHours: true,
          maxOpenQuantity: null,
          addedOn: null,
        },
      ] satisfies T212InstrumentMetadataItem[]),
    );
    let savedItems: T212InstrumentCatalogItem[] = [];

    const syncT212InstrumentCatalog = createSyncT212InstrumentCatalog({
      client: { fetchInstrumentsMetadata } satisfies Pick<
        BrokerClient,
        'fetchInstrumentsMetadata'
      >,
      dataManager: {
        saveT212InstrumentCatalogItems: (items) => {
          savedItems = items;
          return okAsync(items.length);
        },
      } satisfies Pick<BrokerDataManager, 'saveT212InstrumentCatalogItems'>,
      now: () => new Date('2026-04-06T12:00:00.000Z'),
    });

    const result = await syncT212InstrumentCatalog();

    expect(result.isOk()).toBe(true);
    expect(fetchInstrumentsMetadata).toHaveBeenCalledTimes(1);
    expect(savedItems).toEqual([
      {
        ticker: 'AAPL_US_EQ',
        isin: 'US0378331005',
        name: 'Apple',
        shortName: 'Apple',
        instrumentType: 'STOCK',
        currencyCode: 'USD',
        extendedHours: true,
        maxOpenQuantity: null,
        addedOn: null,
        fetchedAt: '2026-04-06T12:00:00.000Z',
      },
    ]);
  });
});
