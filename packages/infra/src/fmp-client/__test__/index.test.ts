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
});
