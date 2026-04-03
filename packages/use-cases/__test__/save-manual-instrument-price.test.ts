import { describe, expect, test } from 'vitest';
import type { BrokerDataManager, InstrumentPriceSnapshot } from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createSaveManualInstrumentPrice } from '../save-manual-instrument-price';

describe('saveManualInstrumentPrice', () => {
  test('saves a manual price snapshot and returns it', async () => {
    let savedSnapshot: InstrumentPriceSnapshot | undefined;

    const dataManager: BrokerDataManager = {
      saveHistoricalOrders: () => okAsync(0),
      getHistoricalOrders: () => okAsync([]),
      getHistoricalOrdersForWeb: () => okAsync({ items: [], filters: {} }),
      getDistinctInstruments: () => okAsync([]),
      saveInstrumentPriceSource: () => okAsync(undefined),
      getInstrumentPriceSourceByIsin: () => okAsync(undefined),
      saveInstrumentPriceSnapshot: (snapshot: InstrumentPriceSnapshot) => {
        savedSnapshot = snapshot;
        return okAsync(undefined);
      },
      saveCurrentPositionSnapshot: () => okAsync(undefined),
      getLatestCurrentPositionSnapshotByIsin: () => okAsync(undefined),
      saveAccountSummarySnapshot: () => okAsync(undefined),
      getLatestAccountSummarySnapshot: () => okAsync(undefined),
      getLatestInstrumentPriceByIsin: () => okAsync(undefined),
      listInstrumentsNeedingPriceRefresh: () => okAsync([]),
    };

    const saveManualInstrumentPrice = createSaveManualInstrumentPrice({
      dataManager,
      now: () => new Date('2026-04-02T10:15:00.000Z'),
    });
    const result = await saveManualInstrumentPrice({
      isin: 'US0079031078',
      price: 123.45,
      currency: 'USD',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        isin: 'US0079031078',
        provider: 'manual',
        providerSymbol: 'MANUAL',
        currency: 'USD',
        price: 123.45,
        priceType: 'manual',
        asOf: '2026-04-02T10:15:00.000Z',
        fetchedAt: '2026-04-02T10:15:00.000Z',
      });
    }

    expect(savedSnapshot).toEqual({
      isin: 'US0079031078',
      provider: 'manual',
      providerSymbol: 'MANUAL',
      currency: 'USD',
      price: 123.45,
      priceType: 'manual',
      asOf: '2026-04-02T10:15:00.000Z',
      fetchedAt: '2026-04-02T10:15:00.000Z',
    });
  });
});
