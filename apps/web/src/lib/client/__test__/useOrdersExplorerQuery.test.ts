import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrdersExplorerDataActionMock = vi.fn();

vi.mock('@/actions/orders-explorer-action', () => ({
  getOrdersExplorerDataAction: getOrdersExplorerDataActionMock,
}));

describe('getOrdersExplorerQueryOptions', () => {
  beforeEach(() => {
    getOrdersExplorerDataActionMock.mockReset();
  });

  it('uses the explorer query key and action query function', async () => {
    const { getOrdersExplorerQueryOptions, ordersExplorerQueryKey } =
      await import('@/lib/client/useOrdersExplorerQuery');
    const expectedData = {
      instruments: [],
      latestAccountSummarySnapshot: null,
      orders: [],
    };

    getOrdersExplorerDataActionMock.mockResolvedValue(expectedData);

    const options = getOrdersExplorerQueryOptions();

    await expect(options.queryFn()).resolves.toEqual(expectedData);
    expect(options.queryKey).toEqual(ordersExplorerQueryKey);
  });
});
