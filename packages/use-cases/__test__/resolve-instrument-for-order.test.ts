import { describe, expect, test, vi } from 'vitest';
import type {
  BrokerClient,
  BrokerDataManager,
  T212InstrumentCatalogItem,
  T212InstrumentMetadataItem,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createResolveInstrumentForOrder } from '../resolve-instrument-for-order';

const localCatalogItems: T212InstrumentCatalogItem[] = [
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
    fetchedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    ticker: 'NVDDl_EQ',
    isin: 'XS123',
    name: 'IncomeShares NVIDIA NVDA Options',
    shortName: 'NVDA Options',
    instrumentType: 'ETF',
    currencyCode: 'USD',
    extendedHours: false,
    maxOpenQuantity: null,
    addedOn: null,
    fetchedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    ticker: 'NVDA_US_EQ',
    isin: 'US67066G1040',
    name: 'NVIDIA',
    shortName: 'NVIDIA',
    instrumentType: 'STOCK',
    currencyCode: 'USD',
    extendedHours: true,
    maxOpenQuantity: null,
    addedOn: null,
    fetchedAt: '2026-04-06T10:00:00.000Z',
  },
];

const remoteMetadataItems: T212InstrumentMetadataItem[] = [
  {
    ticker: 'MSFT_US_EQ',
    isin: 'US5949181045',
    name: 'Microsoft',
    shortName: 'Microsoft',
    type: 'STOCK',
    currencyCode: 'USD',
    extendedHours: true,
    maxOpenQuantity: null,
    addedOn: null,
  },
];

describe('resolveInstrumentForOrder', () => {
  test('returns a unique local match without calling the broker', async () => {
    const fetchInstrumentsMetadata = vi.fn(() => okAsync(remoteMetadataItems));
    const client: Pick<BrokerClient, 'fetchInstrumentsMetadata'> = {
      fetchInstrumentsMetadata,
    };
    const dataManager: Pick<
      BrokerDataManager,
      'findT212InstrumentCatalogMatches' | 'saveT212InstrumentCatalogItems'
    > = {
      findT212InstrumentCatalogMatches: () => okAsync([localCatalogItems[0]!]),
      saveT212InstrumentCatalogItems: vi.fn(() => okAsync(0)),
    };

    const resolveInstrumentForOrder = createResolveInstrumentForOrder({
      client,
      dataManager,
    });
    const result = await resolveInstrumentForOrder('AAPL');

    expect(result.isOk()).toBe(true);
    expect(fetchInstrumentsMetadata).not.toHaveBeenCalled();
    if (result.isOk()) {
      expect(result.value.ticker).toBe('AAPL_US_EQ');
    }
  });

  test('falls back to live metadata, persists it, and retries resolution', async () => {
    const fetchInstrumentsMetadata = vi.fn(() => okAsync(remoteMetadataItems));
    const savedItems: T212InstrumentCatalogItem[][] = [];
    const findT212InstrumentCatalogMatches = vi
      .fn()
      .mockReturnValueOnce(okAsync([]))
      .mockImplementation(() => okAsync([
        {
          ticker: 'MSFT_US_EQ',
          isin: 'US5949181045',
          name: 'Microsoft',
          shortName: 'Microsoft',
          instrumentType: 'STOCK',
          currencyCode: 'USD',
          extendedHours: true,
          maxOpenQuantity: null,
          addedOn: null,
          fetchedAt: '2026-04-06T11:00:00.000Z',
        },
      ]));

    const resolveInstrumentForOrder = createResolveInstrumentForOrder({
      client: { fetchInstrumentsMetadata },
      dataManager: {
        findT212InstrumentCatalogMatches,
        saveT212InstrumentCatalogItems: (items) => {
          savedItems.push(items);
          return okAsync(items.length);
        },
      },
      now: () => new Date('2026-04-06T11:00:00.000Z'),
    });

    const result = await resolveInstrumentForOrder('msft');

    expect(result.isOk()).toBe(true);
    expect(fetchInstrumentsMetadata).toHaveBeenCalledTimes(1);
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]?.[0]?.ticker).toBe('MSFT_US_EQ');
    if (result.isOk()) {
      expect(result.value.ticker).toBe('MSFT_US_EQ');
    }
  });

  test('prefers the common stock when input matches the public ticker exactly', async () => {
    const resolveInstrumentForOrder = createResolveInstrumentForOrder({
      client: {
        fetchInstrumentsMetadata: vi.fn(() => okAsync(remoteMetadataItems)),
      },
      dataManager: {
        findT212InstrumentCatalogMatches: () =>
          okAsync([
            localCatalogItems[1]!,
            localCatalogItems[2]!,
          ]),
        saveT212InstrumentCatalogItems: vi.fn(() => okAsync(0)),
      },
    });

    const result = await resolveInstrumentForOrder('nvda');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ticker).toBe('NVDA_US_EQ');
    }
  });

  test('returns a validation error when multiple matches remain', async () => {
    const resolveInstrumentForOrder = createResolveInstrumentForOrder({
      client: {
        fetchInstrumentsMetadata: vi.fn(() => okAsync(remoteMetadataItems)),
      },
      dataManager: {
        findT212InstrumentCatalogMatches: () =>
          okAsync([
            {
              ...localCatalogItems[1]!,
              ticker: 'NV3Sl_EQ',
              name: 'Leverage Shares -3x Short Nvidia NVDA',
            },
            localCatalogItems[1]!,
          ]),
        saveT212InstrumentCatalogItems: vi.fn(() => okAsync(0)),
      },
    });

    const result = await resolveInstrumentForOrder('nvidia');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('Multiple instruments matched');
    }
  });
});
