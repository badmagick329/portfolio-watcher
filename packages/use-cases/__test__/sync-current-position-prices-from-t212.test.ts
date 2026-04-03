import { describe, expect, test } from 'vitest';
import type {
  BrokerClient,
  BrokerDataManager,
  InstrumentPriceSnapshot,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createSyncCurrentPositionPricesFromT212 } from '../sync-current-position-prices-from-t212';

describe('syncCurrentPositionPricesFromT212', () => {
  test('saves one t212 snapshot per open position', async () => {
    const savedSnapshots: InstrumentPriceSnapshot[] = [];

    const client = {
      fetchPositions: () =>
        okAsync([
          {
            averagePricePaid: 295.12,
            createdAt: '2026-04-03T18:00:00Z',
            currentPrice: 300.61,
            instrument: {
              ticker: 'AXP_US_EQ',
              name: 'American Express',
              isin: 'US0258161092',
              currencyCode: 'USD',
            },
            quantity: 1,
            quantityAvailableForTrading: 1,
            quantityInPies: 0,
            walletImpact: {
              invested: 199,
              marketValue: 197.85,
              result: -1.15,
              averagePrice: 227.17,
              currentPrice: 225.86,
            },
          },
          {
            averagePricePaid: 100,
            createdAt: '2026-04-03T18:00:00Z',
            currentPrice: 101.5,
            instrument: {
              ticker: 'VUAG_GB_EQ',
              name: 'Vanguard S&P 500',
              isin: 'IE00BFMXXD54',
              currencyCode: 'GBP',
            },
            quantity: 2,
            quantityAvailableForTrading: 2,
            quantityInPies: 0,
            walletImpact: {
              invested: 200,
              marketValue: 203,
              result: 3,
              averagePrice: 100,
              currentPrice: 101.5,
            },
          },
        ]),
    } satisfies Pick<BrokerClient, 'fetchPositions'>;

    const dataManager = {
      saveInstrumentPriceSnapshot: (snapshot: InstrumentPriceSnapshot) => {
        savedSnapshots.push(snapshot);
        return okAsync(undefined);
      },
    } satisfies Pick<BrokerDataManager, 'saveInstrumentPriceSnapshot'>;

    const syncCurrentPositionPricesFromT212 =
      createSyncCurrentPositionPricesFromT212({
        client,
        dataManager,
        now: () => new Date('2026-04-03T19:30:00.000Z'),
      });

    const result = await syncCurrentPositionPricesFromT212();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        attempted: 2,
        persisted: 2,
      });
    }

    expect(savedSnapshots).toEqual([
      {
        isin: 'US0258161092',
        provider: 't212',
        providerSymbol: 'AXP_US_EQ',
        currency: 'USD',
        price: 300.61,
        priceType: 'position_current',
        asOf: '2026-04-03T19:30:00.000Z',
        fetchedAt: '2026-04-03T19:30:00.000Z',
      },
      {
        isin: 'IE00BFMXXD54',
        provider: 't212',
        providerSymbol: 'VUAG_GB_EQ',
        currency: 'GBP',
        price: 101.5,
        priceType: 'position_current',
        asOf: '2026-04-03T19:30:00.000Z',
        fetchedAt: '2026-04-03T19:30:00.000Z',
      },
    ]);
  });
});
