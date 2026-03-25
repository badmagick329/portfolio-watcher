import { afterEach, describe, expect, test } from 'vitest';
import { createEodhdInstrumentPriceClient } from '../eodhd-client';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.EODHD_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.EODHD_API_KEY = originalApiKey;
});

describe('eodhd instrument price client', () => {
  test('prefers an exact isin primary listing when multiple listings exist', async () => {
    process.env.EODHD_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            Code: 'AMD.MX',
            Exchange: 'MX',
            Name: 'Advanced Micro Devices Inc',
            Currency: 'MXN',
            ISIN: 'US0079031078',
            isPrimary: false,
          },
          {
            Code: 'AMD',
            Exchange: 'US',
            Name: 'Advanced Micro Devices Inc',
            Currency: 'USD',
            ISIN: 'US0079031078',
            isPrimary: true,
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
      expect(result.value).toMatchObject({
        provider: 'eodhd',
        providerSymbol: 'AMD',
        providerExchange: 'US',
        resolvedCurrency: 'USD',
        isPrimary: true,
      });
    }
  });

  test('prefers a compatible currency match over a non-primary mismatch', async () => {
    process.env.EODHD_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            Code: 'ABC.DE',
            Exchange: 'XETRA',
            Name: 'Example Corp',
            Currency: 'EUR',
            ISIN: 'US0000000001',
            isPrimary: false,
          },
          {
            Code: 'ABC.LSE',
            Exchange: 'LSE',
            Name: 'Example Corp plc',
            Currency: 'GBX',
            ISIN: 'US0000000001',
            isPrimary: false,
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createEodhdInstrumentPriceClient();
    const result = await client.resolveByIsin({
      isin: 'US0000000001',
      name: 'Example Corp',
      currency: 'GBP',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({
        providerSymbol: 'ABC.LSE',
        resolvedCurrency: 'GBX',
        isPrimary: false,
      });
    }
  });

  test('rejects genuinely ambiguous results by returning null', async () => {
    process.env.EODHD_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            Code: 'AAA',
            Exchange: 'US',
            Name: 'Alpha Holdings',
            Currency: 'USD',
            ISIN: 'US1111111111',
            isPrimary: false,
          },
          {
            Code: 'AAB',
            Exchange: 'LN',
            Name: 'Alpha Holdings',
            Currency: 'USD',
            ISIN: 'US1111111111',
            isPrimary: false,
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;

    const client = createEodhdInstrumentPriceClient();
    const result = await client.resolveByIsin({
      isin: 'US1111111111',
      name: 'Alpha Holdings',
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
