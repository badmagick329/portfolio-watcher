import { afterEach, describe, expect, test } from 'vitest';
import { accountCashSchema } from '@portfolio/domain';
import { request } from '../transport';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('trading212 transport', () => {
  test('request returns parsed data for a valid response', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          free: 1,
          total: 2,
          ppl: 3,
          result: 4,
          invested: 5,
          pieCash: 6,
          blocked: 7,
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const result = await request({
      endPoint: 'https://example.test/account/cash',
      schema: accountCashSchema,
      creds: 'abc',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.total).toBe(2);
    }
  });

  test('request returns RATE_LIMIT for 429 responses', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: 'slow down' }), {
        status: 429,
        headers: {
          'x-ratelimit-limit': '10',
          'x-ratelimit-period': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '9999999999',
          'x-ratelimit-used': '10',
        },
      })) as unknown as typeof fetch;

    const result = await request({
      endPoint: 'https://example.test/orders',
      schema: accountCashSchema,
      creds: 'abc',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('RATE_LIMIT');
      if (result.error.code === 'RATE_LIMIT') {
        expect(result.error.rateLimitResponse.rateLimitRemaining).toBe(0);
      }
    }
  });

  test('request returns FORBIDDEN for 403 responses', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: 'nope' }), {
        status: 403,
      })) as unknown as typeof fetch;

    const result = await request({
      endPoint: 'https://example.test/orders',
      schema: accountCashSchema,
      creds: 'abc',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  test('request returns API for invalid schema', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ nope: true }), {
        status: 200,
      })) as unknown as typeof fetch;

    const result = await request({
      endPoint: 'https://example.test/account/cash',
      schema: accountCashSchema,
      creds: 'abc',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('API');
    }
  });
});
