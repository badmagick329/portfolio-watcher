import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategoryManagementActionMock = vi.fn();
const getAllocationActionMock = vi.fn();
const getRiskMappingsActionMock = vi.fn();

vi.mock('@/actions/instrument-categories-action', () => ({
  getAllocationAction: getAllocationActionMock,
  getCategoryManagementAction: getCategoryManagementActionMock,
  getRiskMappingsAction: getRiskMappingsActionMock,
}));

describe('category query options', () => {
  beforeEach(() => {
    getCategoryManagementActionMock.mockReset();
    getAllocationActionMock.mockReset();
    getRiskMappingsActionMock.mockReset();
  });

  it('uses the management query key and action query function', async () => {
    const {
      getCategoryManagementQueryOptions,
    } = await import('@/lib/client/categories/useCategoryManagementQuery');
    const { categoryManagementQueryKey } = await import(
      '@/lib/client/categories/category-query-keys'
    );
    const expectedData = {
      capabilities: {},
      instruments: [],
    };

    getCategoryManagementActionMock.mockResolvedValue(expectedData);

    const options = getCategoryManagementQueryOptions();
    const queryFn = options.queryFn as unknown as () => Promise<typeof expectedData>;

    await expect(queryFn()).resolves.toEqual(expectedData);
    expect(options.queryKey).toEqual(categoryManagementQueryKey);
  });

  it('uses the allocation query key and action query function', async () => {
    const { getAllocationQueryOptions } = await import(
      '@/lib/client/categories/useAllocationQuery'
    );
    const { allocationQueryKey } = await import(
      '@/lib/client/categories/category-query-keys'
    );
    const expectedData = {
      capabilities: {},
      historicalOrders: [],
      instruments: [],
      riskMappingSummary: { unresolvedCurrentHoldingsCount: 0 },
    };

    getAllocationActionMock.mockResolvedValue(expectedData);

    const options = getAllocationQueryOptions();
    const queryFn = options.queryFn as unknown as () => Promise<typeof expectedData>;

    await expect(queryFn()).resolves.toEqual(expectedData);
    expect(options.queryKey).toEqual(allocationQueryKey);
  });

  it('uses the risk mappings query key and action query function', async () => {
    const { getRiskMappingsQueryOptions } = await import(
      '@/lib/client/categories/useRiskMappingsQuery'
    );
    const { riskMappingsQueryKey } = await import(
      '@/lib/client/categories/category-query-keys'
    );
    const expectedData = {
      capabilities: {},
      instruments: [],
      riskMappingSummary: { unresolvedCurrentHoldingsCount: 0 },
    };

    getRiskMappingsActionMock.mockResolvedValue(expectedData);

    const options = getRiskMappingsQueryOptions();
    const queryFn = options.queryFn as unknown as () => Promise<typeof expectedData>;

    await expect(queryFn()).resolves.toEqual(expectedData);
    expect(options.queryKey).toEqual(riskMappingsQueryKey);
  });
});
