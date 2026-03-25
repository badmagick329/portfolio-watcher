import { afterEach, describe, expect, test } from 'vitest';
import { createFmpInstrumentPriceClient } from '../fmp-client';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.FMP_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.FMP_API_KEY = originalApiKey;
});

describe('fmp instrument price client', () => {
  test('resolves an instrument by isin', async () => {
    process.env.FMP_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            symbol: 'AMD',
            name: 'Advanced Micro Devices',
            currency: 'USD',
            exchangeShortName: 'NASDAQ',
            isin: 'US0079031078',
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createFmpInstrumentPriceClient();
    const result = await client.resolveByIsin({
      isin: 'US0079031078',
      name: 'Advanced Micro Devices',
      currency: 'USD',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value?.providerSymbol).toBe('AMD');
    }
  });

  test('fetches the latest eod price', async () => {
    process.env.FMP_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            symbol: 'AMD',
            date: '2026-03-24',
            price: 123.45,
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createFmpInstrumentPriceClient();
    const result = await client.fetchLatestPrice({
      isin: 'US0079031078',
      provider: 'fmp',
      providerSymbol: 'AMD',
      providerExchange: 'NASDAQ',
      providerMic: null,
      resolvedName: 'Advanced Micro Devices',
      resolvedCurrency: 'USD',
      resolutionConfidence: 0.95,
      lastResolvedAt: '2026-03-25T10:00:00.000Z',
      lastFetchStatus: null,
      lastFetchError: null,
      lastFetchAttemptedAt: null,
      consecutiveFailures: 0,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.price).toBe(123.45);
      expect(result.value.asOf).toBe('2026-03-24');
    }
  });
});
