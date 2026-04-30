import { describe, expect, test } from 'vitest';
import type {
  AccountSummarySnapshot,
  BrokerClient,
  BrokerDataManager,
  CurrentPositionSnapshot,
  InstrumentPriceSnapshot,
  ObservedInstrumentListing,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createSyncCurrentPositionPricesFromT212 } from '../sync-current-position-prices-from-t212';

describe('syncCurrentPositionPricesFromT212', () => {
  test('saves price, current-position, and account-summary snapshots', async () => {
    const savedSnapshots: InstrumentPriceSnapshot[] = [];
    const savedCurrentPositionSnapshots: CurrentPositionSnapshot[] = [];
    const savedObservedInstrumentListings: ObservedInstrumentListing[] = [];
    const savedAccountSummarySnapshots: AccountSummarySnapshot[] = [];
    const prunedCutoffs: string[] = [];

    const client = {
      fetchAccountSummary: () =>
        okAsync({
          cash: {
            availableToTrade: 100,
            inPies: 0,
            reservedForOrders: 0,
          },
          currency: 'GBP',
          id: 1,
          investments: {
            currentValue: 400.85,
            realizedProfitLoss: 12.5,
            totalCost: 399,
            unrealizedProfitLoss: 1.85,
          },
          totalValue: 500.85,
        }),
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
              currency: 'GBP',
              totalCost: 199,
              currentValue: 197.85,
              unrealizedProfitLoss: -1.15,
              fxImpact: 0.2,
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
              currency: 'GBP',
              totalCost: 200,
              currentValue: 203,
              unrealizedProfitLoss: 3,
            },
          },
        ]),
    } satisfies Pick<BrokerClient, 'fetchAccountSummary' | 'fetchPositions'>;

    const dataManager = {
      saveInstrumentPriceSnapshot: (snapshot: InstrumentPriceSnapshot) => {
        savedSnapshots.push(snapshot);
        return okAsync(undefined);
      },
      saveCurrentPositionSnapshot: (snapshot: CurrentPositionSnapshot) => {
        savedCurrentPositionSnapshots.push(snapshot);
        return okAsync(undefined);
      },
      saveObservedInstrumentListing: (listing: ObservedInstrumentListing) => {
        savedObservedInstrumentListings.push(listing);
        return okAsync(undefined);
      },
      saveAccountSummarySnapshot: (snapshot: AccountSummarySnapshot) => {
        savedAccountSummarySnapshots.push(snapshot);
        return okAsync(undefined);
      },
      prunePortfolioStateSnapshotsOlderThan: (cutoffAsOf: string) => {
        prunedCutoffs.push(cutoffAsOf);
        return okAsync(undefined);
      },
    } satisfies Pick<
      BrokerDataManager,
      | 'saveInstrumentPriceSnapshot'
      | 'saveCurrentPositionSnapshot'
      | 'saveObservedInstrumentListing'
      | 'saveAccountSummarySnapshot'
      | 'prunePortfolioStateSnapshotsOlderThan'
    >;

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
        attemptedPositions: 2,
        persistedPrices: 2,
        persistedPositions: 2,
        persistedAccountSummaries: 1,
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
    expect(savedObservedInstrumentListings).toEqual([
      {
        ticker: 'AXP_US_EQ',
        name: 'American Express',
        isin: 'US0258161092',
        currency: 'USD',
      },
      {
        ticker: 'VUAG_GB_EQ',
        name: 'Vanguard S&P 500',
        isin: 'IE00BFMXXD54',
        currency: 'GBP',
      },
    ]);
    expect(savedCurrentPositionSnapshots).toEqual([
      {
        isin: 'US0258161092',
        providerSymbol: 'AXP_US_EQ',
        quantity: 1,
        currentPrice: 300.61,
        instrumentCurrency: 'USD',
        walletCurrency: 'GBP',
        currentValue: 197.85,
        totalCost: 199,
        unrealizedProfitLoss: -1.15,
        fxImpact: 0.2,
        asOf: '2026-04-03T19:30:00.000Z',
        fetchedAt: '2026-04-03T19:30:00.000Z',
      },
      {
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAG_GB_EQ',
        quantity: 2,
        currentPrice: 101.5,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 203,
        totalCost: 200,
        unrealizedProfitLoss: 3,
        fxImpact: null,
        asOf: '2026-04-03T19:30:00.000Z',
        fetchedAt: '2026-04-03T19:30:00.000Z',
      },
    ]);
    expect(savedAccountSummarySnapshots).toEqual([
      {
        currency: 'GBP',
        currentValue: 400.85,
        totalCost: 399,
        realizedProfitLoss: 12.5,
        unrealizedProfitLoss: 1.85,
        totalValue: 500.85,
        asOf: '2026-04-03T19:30:00.000Z',
        fetchedAt: '2026-04-03T19:30:00.000Z',
      },
    ]);
    expect(prunedCutoffs).toEqual(['2026-01-03T19:30:00.000Z']);
  });
});
