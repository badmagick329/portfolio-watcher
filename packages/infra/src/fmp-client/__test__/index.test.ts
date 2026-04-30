import { afterEach, describe, expect, test } from 'vitest';
import { createFmpClient } from '../index';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fmp client', () => {
  test('maps 429 responses to rate limit errors', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ 'Error Message': 'Limit Reach' }), {
        status: 429,
      })) as unknown as typeof fetch;

    const client = createFmpClient({ apiKey: 'test-key' });
    const result = await client.fetchInstrumentRiskProfile('VUAG.L');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('RATE_LIMIT');
      expect(result.error.message).toContain('Limit Reach');
    }
  });

  test('parses search-isin candidates', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            symbol: 'CSCA.L',
            name: 'iShares MSCI Canada UCITS ETF',
            isin: 'IE00B52SF786',
            marketCap: 123456,
          },
        ]),
      )) as unknown as typeof fetch;

    const client = createFmpClient({ apiKey: 'test-key' });
    const result =
      await client.searchInstrumentRiskCandidatesByIsin('IE00B52SF786');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([
        {
          symbol: 'CSCA.L',
          name: 'iShares MSCI Canada UCITS ETF',
          isin: 'IE00B52SF786',
          marketCap: 123456,
        },
      ]);
    }
  });

  test('parses profile exchange metadata', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            symbol: 'SAAB-B.ST',
            companyName: 'Saab AB (publ)',
            isin: 'SE0021921269',
            beta: 0.085,
            exchange: 'STO',
            exchangeFullName: 'Stockholm Stock Exchange',
          },
        ]),
      )) as unknown as typeof fetch;

    const client = createFmpClient({ apiKey: 'test-key' });
    const result = await client.fetchInstrumentRiskProfile('SAAB-B.ST');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        symbol: 'SAAB-B.ST',
        companyName: 'Saab AB (publ)',
        isin: 'SE0021921269',
        beta: 0.085,
        exchange: 'STO',
        exchangeFullName: 'Stockholm Stock Exchange',
      });
    }
  });
});
