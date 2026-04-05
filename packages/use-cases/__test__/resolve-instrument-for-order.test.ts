import { describe, expect, test } from 'vitest';
import type { BrokerClient, T212InstrumentMetadataItem } from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { createResolveInstrumentForOrder } from '../resolve-instrument-for-order';

const metadataItems: T212InstrumentMetadataItem[] = [
  {
    ticker: 'AAPL_US_EQ',
    isin: 'US0378331005',
    name: 'Apple',
    currencyCode: 'USD',
  },
  {
    ticker: 'MSFT_US_EQ',
    isin: 'US5949181045',
    name: 'Microsoft',
    currencyCode: 'USD',
  },
  {
    ticker: 'MSCI_GB_EQ',
    isin: 'GB00B4L5Y983',
    name: 'MSCI Plc',
    currencyCode: 'GBP',
  },
];

describe('resolveInstrumentForOrder', () => {
  test('resolves an exact Trading 212 ticker', async () => {
    const client: Pick<BrokerClient, 'fetchInstrumentsMetadata'> = {
      fetchInstrumentsMetadata: () => okAsync(metadataItems),
    };

    const resolveInstrumentForOrder = createResolveInstrumentForOrder(client);
    const result = await resolveInstrumentForOrder('MSFT_US_EQ');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        ticker: 'MSFT_US_EQ',
        isin: 'US5949181045',
        name: 'Microsoft',
        currencyCode: 'USD',
      });
    }
  });

  test('resolves a fuzzy/common symbol when it is unique', async () => {
    const client: Pick<BrokerClient, 'fetchInstrumentsMetadata'> = {
      fetchInstrumentsMetadata: () => okAsync(metadataItems),
    };

    const resolveInstrumentForOrder = createResolveInstrumentForOrder(client);
    const result = await resolveInstrumentForOrder('Apple');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ticker).toBe('AAPL_US_EQ');
    }
  });

  test('returns a validation error when multiple instruments match', async () => {
    const client: Pick<BrokerClient, 'fetchInstrumentsMetadata'> = {
      fetchInstrumentsMetadata: () => okAsync(metadataItems),
    };

    const resolveInstrumentForOrder = createResolveInstrumentForOrder(client);
    const result = await resolveInstrumentForOrder('ms');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('Multiple instruments matched');
    }
  });
});
