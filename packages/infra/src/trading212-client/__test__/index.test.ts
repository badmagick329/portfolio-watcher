import { afterEach, describe, expect, test } from 'vitest';
import type { Cache } from '@portfolio/domain';
import { ok } from 'neverthrow';
import {
  createTrading212Client,
  createTrading212ClientWithCache,
} from '../index';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const createMemoryCache = (): Cache => {
  const store = new Map<string, string>();

  return {
    save: (key, content) => {
      store.set(key, content);
      return ok(undefined);
    },
    get: (key) => store.get(key),
    typesafeGet: (key, schema) => {
      const raw = store.get(key);
      if (!raw) {
        return undefined;
      }
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : undefined;
    },
    reset: () => {
      store.clear();
      return ok(undefined);
    },
  };
};

const historicalOrdersPayload = {
  items: [],
  nextPagePath: null,
};

const positionsPayload = [
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
];

describe('trading212 client', () => {
  test('fetchHistoricalOrders resolves relative nextPagePath', async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = ((async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify(historicalOrdersPayload), {
        status: 200,
      });
    }) as unknown) as typeof fetch;

    const client = createTrading212Client();
    const result = await client.fetchHistoricalOrders({
      nextPagePath: '/api/v0/equity/history/orders?limit=50',
    });

    expect(result.isOk()).toBe(true);
    expect(requestedUrls).toEqual([
      'https://live.trading212.com/api/v0/equity/history/orders?limit=50',
    ]);
  });

  test('cached client caches account cash responses', async () => {
    let fetchCount = 0;
    globalThis.fetch = ((async () => {
      fetchCount++;
      return new Response(
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
      );
    }) as unknown) as typeof fetch;

    const client = createTrading212ClientWithCache(createMemoryCache());

    await client.fetchAccountCash();
    await client.fetchAccountCash();

    expect(fetchCount).toBe(1);
  });

  test('cached client returns typed rate limit errors for historical orders', async () => {
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

    const client = createTrading212ClientWithCache(createMemoryCache());
    const result = await client.fetchHistoricalOrders({ limit: '50' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('RATE_LIMIT');
    }
  });

  test('fetchPositions returns current positions with embedded instrument identity', async () => {
    globalThis.fetch = ((async () =>
      new Response(JSON.stringify(positionsPayload), {
        status: 200,
      })) as unknown) as typeof fetch;

    const client = createTrading212Client();
    const result = await client.fetchPositions();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(positionsPayload);
      expect(result.value[0]?.instrument.isin).toBe('US0258161092');
      expect(result.value[0]?.instrument.ticker).toBe('AXP_US_EQ');
      expect(result.value[0]?.currentPrice).toBe(300.61);
    }
  });
});
