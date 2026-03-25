import { afterEach, describe, expect, test } from 'bun:test';
import { createEodhdInstrumentPriceClient } from '../eodhd-client';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.EODHD_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.EODHD_API_KEY = originalApiKey;
});

describe('eodhd instrument price client', () => {
  test('rejects ambiguous or mismatched results by returning null', async () => {
    process.env.EODHD_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            Code: 'BAD',
            Exchange: 'US',
            Name: 'Completely Different',
            Currency: 'USD',
            Isin: 'US0000000000',
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createEodhdInstrumentPriceClient();
    const result = await client.resolveByIsin({
      isin: 'US0079031078',
      name: 'Advanced Micro Devices',
      currency: 'USD',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });

  test('fetches the latest eod price', async () => {
    process.env.EODHD_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          date: '2026-03-24',
          close: 456.78,
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createEodhdInstrumentPriceClient();
    const result = await client.fetchLatestPrice({
      isin: 'US0378331005',
      provider: 'eodhd',
      providerSymbol: 'AAPL',
      providerExchange: 'US',
      providerMic: null,
      resolvedName: 'Apple',
      resolvedCurrency: 'USD',
      resolutionConfidence: 0.8,
      lastResolvedAt: '2026-03-25T10:00:00.000Z',
      lastFetchStatus: null,
      lastFetchError: null,
      lastFetchAttemptedAt: null,
      consecutiveFailures: 0,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.price).toBe(456.78);
      expect(result.value.asOf).toBe('2026-03-24');
    }
  });
});
