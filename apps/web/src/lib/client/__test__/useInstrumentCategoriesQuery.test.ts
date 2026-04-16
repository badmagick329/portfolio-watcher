import { beforeEach, describe, expect, it, vi } from 'vitest';

const getInstrumentCategoriesActionMock = vi.fn();

vi.mock('@/actions/instrument-categories-action', () => ({
  getInstrumentCategoriesAction: getInstrumentCategoriesActionMock,
}));

describe('getInstrumentCategoriesQueryOptions', () => {
  beforeEach(() => {
    getInstrumentCategoriesActionMock.mockReset();
  });

  it('uses the category query key and action query function', async () => {
    const {
      getInstrumentCategoriesQueryOptions,
      instrumentCategoriesQueryKey,
    } = await import('@/lib/client/useInstrumentCategoriesQuery');
    const expectedData = {
      historicalOrders: [],
      instruments: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          isin: 'US0378331005',
          currency: 'USD',
          category: 'growth',
          currentQuantity: 1,
          currentlyHeld: true,
          currentPositionSnapshot: null,
        },
      ],
    };

    getInstrumentCategoriesActionMock.mockResolvedValue(expectedData);

    const options = getInstrumentCategoriesQueryOptions();
    const queryFn = options.queryFn as unknown as () => Promise<typeof expectedData>;

    await expect(queryFn()).resolves.toEqual(expectedData);
    expect(options.queryKey).toEqual(instrumentCategoriesQueryKey);
  });
});
