import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCategorizedInstrumentsMock = vi.fn();
const getHistoricalOrdersForWebMock = vi.fn();
const getAppCapabilitiesMock = vi.fn();
const getLatestCurrentPositionSnapshotMock = vi.fn();
const getLatestInstrumentRiskMetricMock = vi.fn();
const listInstrumentProviderSymbolsMock = vi.fn();
const listInstrumentProviderResolutionStatusesMock = vi.fn();
const listInstrumentProviderResolutionCandidatesMock = vi.fn();
const listInstrumentRiskMetricSyncStatusesMock = vi.fn();
const resolveInstrumentProviderMappingsMock = vi.fn();
const confirmInstrumentProviderResolutionMock = vi.fn();
const clearInstrumentProviderResolutionMock = vi.fn();
const setInstrumentCategoriesMock = vi.fn();
const unsetInstrumentCategoriesMock = vi.fn();

vi.mock('@/lib/server/composition', () => ({
  clearInstrumentProviderResolution: clearInstrumentProviderResolutionMock,
  confirmInstrumentProviderResolution: confirmInstrumentProviderResolutionMock,
  getHistoricalOrdersForWeb: getHistoricalOrdersForWebMock,
  getAppCapabilities: getAppCapabilitiesMock,
  getLatestCurrentPositionSnapshot: getLatestCurrentPositionSnapshotMock,
  getLatestInstrumentRiskMetric: getLatestInstrumentRiskMetricMock,
  listInstrumentProviderResolutionCandidates:
    listInstrumentProviderResolutionCandidatesMock,
  listInstrumentProviderResolutionStatuses:
    listInstrumentProviderResolutionStatusesMock,
  listInstrumentProviderSymbols: listInstrumentProviderSymbolsMock,
  listInstrumentRiskMetricSyncStatuses:
    listInstrumentRiskMetricSyncStatusesMock,
  listCategorizedInstruments: listCategorizedInstrumentsMock,
  resolveInstrumentProviderMappings: resolveInstrumentProviderMappingsMock,
  setInstrumentCategories: setInstrumentCategoriesMock,
  unsetInstrumentCategories: unsetInstrumentCategoriesMock,
}));

describe('instrument category actions', () => {
  beforeEach(() => {
    getHistoricalOrdersForWebMock.mockReset();
    getAppCapabilitiesMock.mockReset();
    getLatestCurrentPositionSnapshotMock.mockReset();
    getLatestInstrumentRiskMetricMock.mockReset();
    listInstrumentProviderSymbolsMock.mockReset();
    listInstrumentProviderResolutionStatusesMock.mockReset();
    listInstrumentProviderResolutionCandidatesMock.mockReset();
    listInstrumentRiskMetricSyncStatusesMock.mockReset();
    resolveInstrumentProviderMappingsMock.mockReset();
    confirmInstrumentProviderResolutionMock.mockReset();
    clearInstrumentProviderResolutionMock.mockReset();
    listCategorizedInstrumentsMock.mockReset();
    setInstrumentCategoriesMock.mockReset();
    unsetInstrumentCategoriesMock.mockReset();
  });

  it('returns category management data with current holding state', async () => {
    const rows = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        currency: 'USD',
        category: 'growth',
      },
      {
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        isin: 'US5949181045',
        currency: 'USD',
        category: null,
      },
    ];
    listCategorizedInstrumentsMock.mockResolvedValue({
      isErr: () => false,
      value: rows,
    });
    getHistoricalOrdersForWebMock.mockResolvedValue({
      isErr: () => false,
      value: {
        items: [
          {
            side: 'BUY',
            quantity: 2,
            filledQuantity: 2,
            instrument: { isin: 'US0378331005' },
            fills: [],
          },
          {
            side: 'BUY',
            quantity: 1,
            filledQuantity: 1,
            instrument: { isin: 'US5949181045' },
            fills: [],
          },
          {
            side: 'SELL',
            quantity: 1,
            filledQuantity: 1,
            instrument: { isin: 'US5949181045' },
            fills: [],
          },
        ],
      },
    });
    getAppCapabilitiesMock.mockResolvedValue({
      isErr: () => false,
      value: {
        hasBrokerCredentials: true,
        canSyncOrders: true,
        canSyncPortfolioState: true,
        canPlaceOrders: true,
        hasFmpApiKey: true,
        canSyncRiskMetrics: true,
        brokerAccessMode: 'trading_enabled',
        hasHistoricalOrders: true,
        hasCurrentHoldings: true,
        hasCategories: true,
        hasStoredRiskMetrics: true,
        hasSuccessfulSubmittedOrderAttempt: true,
        lastOrdersSyncAt: null,
        lastPortfolioSyncAt: null,
        lastRiskMetricsSyncAt: null,
      },
    });
    getLatestCurrentPositionSnapshotMock.mockImplementation((isin) =>
      Promise.resolve({
        isErr: () => false,
        value:
          isin === 'US0378331005'
            ? {
                isin,
                quantity: 2,
                currentValue: 200,
                totalCost: 150,
                unrealizedProfitLoss: 50,
              }
            : undefined,
      }),
    );
    listInstrumentProviderSymbolsMock.mockResolvedValue({
      isErr: () => false,
      value: [
        {
          isin: 'US0378331005',
          provider: 'fmp',
          providerSymbol: 'AAPL',
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
    });
    listInstrumentProviderResolutionStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [
        {
          isin: 'US0378331005',
          provider: 'fmp',
          status: 'resolved',
          resolvedSymbol: 'AAPL',
          resolutionMethod: 'manual',
          confidence: 'high',
          message: null,
          evidence: null,
          fetchedAt: '2026-04-17T10:00:00.000Z',
          noCandidates: false,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
    });
    listInstrumentProviderResolutionCandidatesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    listInstrumentRiskMetricSyncStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    getLatestInstrumentRiskMetricMock.mockImplementation((isin) =>
      Promise.resolve({
        isErr: () => false,
        value:
          isin === 'US0378331005'
            ? {
                isin,
                provider: 'fmp',
                providerSymbol: 'AAPL',
                beta: 1.2,
                sourceType: 'profile',
                asOf: '2026-04-17T10:00:00.000Z',
                fetchedAt: '2026-04-17T10:00:00.000Z',
              }
            : undefined,
      }),
    );

    const { getCategoryManagementAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getCategoryManagementAction()).resolves.toEqual({
      capabilities: {
        hasBrokerCredentials: true,
        canSyncOrders: true,
        canSyncPortfolioState: true,
        canPlaceOrders: true,
        hasFmpApiKey: true,
        canSyncRiskMetrics: true,
        brokerAccessMode: 'trading_enabled',
        hasHistoricalOrders: true,
        hasCurrentHoldings: true,
        hasCategories: true,
        hasStoredRiskMetrics: true,
        hasSuccessfulSubmittedOrderAttempt: true,
        lastOrdersSyncAt: null,
        lastPortfolioSyncAt: null,
        lastRiskMetricsSyncAt: null,
      },
      instruments: [
        {
          ...rows[0],
          currentQuantity: 2,
          currentlyHeld: true,
        },
        {
          ...rows[1],
          currentQuantity: 0,
          currentlyHeld: false,
        },
      ],
    });
  });

  it('returns allocation data with current snapshots and risk metrics', async () => {
    const rows = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        currency: 'USD',
        category: 'growth',
      },
    ];
    listCategorizedInstrumentsMock.mockResolvedValue({
      isErr: () => false,
      value: rows,
    });
    getHistoricalOrdersForWebMock.mockResolvedValue({
      isErr: () => false,
      value: {
        items: [
          {
            side: 'BUY',
            quantity: 2,
            filledQuantity: 2,
            instrument: { isin: 'US0378331005' },
            fills: [],
          },
        ],
      },
    });
    getAppCapabilitiesMock.mockResolvedValue({
      isErr: () => false,
      value: {
        hasBrokerCredentials: true,
        canSyncOrders: true,
        canSyncPortfolioState: true,
        canPlaceOrders: true,
        hasFmpApiKey: true,
        canSyncRiskMetrics: true,
        brokerAccessMode: 'trading_enabled',
        hasHistoricalOrders: true,
        hasCurrentHoldings: true,
        hasCategories: true,
        hasStoredRiskMetrics: true,
        hasSuccessfulSubmittedOrderAttempt: true,
        lastOrdersSyncAt: null,
        lastPortfolioSyncAt: null,
        lastRiskMetricsSyncAt: null,
      },
    });
    listInstrumentProviderSymbolsMock.mockResolvedValue({
      isErr: () => false,
      value: [
        {
          isin: 'US0378331005',
          provider: 'fmp',
          providerSymbol: 'AAPL',
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
    });
    getLatestCurrentPositionSnapshotMock.mockResolvedValue({
      isErr: () => false,
      value: {
        isin: 'US0378331005',
        quantity: 2,
        currentValue: 200,
        totalCost: 150,
        unrealizedProfitLoss: 50,
      },
    });
    getLatestInstrumentRiskMetricMock.mockResolvedValue({
      isErr: () => false,
      value: {
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
        beta: 1.2,
        sourceType: 'profile',
        asOf: '2026-04-17T10:00:00.000Z',
        fetchedAt: '2026-04-17T10:00:00.000Z',
      },
    });

    const { getAllocationAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getAllocationAction()).resolves.toEqual({
      capabilities: expect.any(Object),
      historicalOrders: [
        {
          side: 'BUY',
          quantity: 2,
          filledQuantity: 2,
          instrument: { isin: 'US0378331005' },
          fills: [],
        },
      ],
      instruments: [
        {
          ...rows[0],
          currentPositionSnapshot: {
            isin: 'US0378331005',
            quantity: 2,
            currentValue: 200,
            totalCost: 150,
            unrealizedProfitLoss: 50,
          },
          currentQuantity: 2,
          currentlyHeld: true,
          riskMetric: {
            isin: 'US0378331005',
            provider: 'fmp',
            providerSymbol: 'AAPL',
            beta: 1.2,
            sourceType: 'profile',
            asOf: '2026-04-17T10:00:00.000Z',
            fetchedAt: '2026-04-17T10:00:00.000Z',
          },
        },
      ],
      riskMappingSummary: {
        unresolvedCurrentHoldingsCount: 0,
      },
    });
  });

  it('returns risk mappings data with candidates and status', async () => {
    const rows = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        currency: 'USD',
        category: 'growth',
      },
    ];
    listCategorizedInstrumentsMock.mockResolvedValue({
      isErr: () => false,
      value: rows,
    });
    getHistoricalOrdersForWebMock.mockResolvedValue({
      isErr: () => false,
      value: {
        items: [
          {
            side: 'BUY',
            quantity: 2,
            filledQuantity: 2,
            instrument: { isin: 'US0378331005' },
            fills: [],
          },
        ],
      },
    });
    getAppCapabilitiesMock.mockResolvedValue({
      isErr: () => false,
      value: {
        hasBrokerCredentials: true,
        canSyncOrders: true,
        canSyncPortfolioState: true,
        canPlaceOrders: true,
        hasFmpApiKey: true,
        canSyncRiskMetrics: true,
        brokerAccessMode: 'trading_enabled',
        hasHistoricalOrders: true,
        hasCurrentHoldings: true,
        hasCategories: true,
        hasStoredRiskMetrics: true,
        hasSuccessfulSubmittedOrderAttempt: true,
        lastOrdersSyncAt: null,
        lastPortfolioSyncAt: null,
        lastRiskMetricsSyncAt: null,
      },
    });
    listInstrumentProviderSymbolsMock.mockResolvedValue({
      isErr: () => false,
      value: [
        {
          isin: 'US0378331005',
          provider: 'fmp',
          providerSymbol: 'AAPL',
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
    });
    listInstrumentProviderResolutionStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [
        {
          isin: 'US0378331005',
          provider: 'fmp',
          status: 'resolved',
          resolvedSymbol: 'AAPL',
          resolutionMethod: 'manual',
          confidence: 'high',
          message: null,
          evidence: null,
          fetchedAt: '2026-04-17T10:00:00.000Z',
          noCandidates: false,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
    });
    listInstrumentProviderResolutionCandidatesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    listInstrumentRiskMetricSyncStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });

    const { getRiskMappingsAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getRiskMappingsAction()).resolves.toEqual({
      capabilities: expect.any(Object),
      instruments: [
        {
          ...rows[0],
          currentQuantity: 2,
          currentlyHeld: true,
          riskMapping: {
            candidates: [],
            mapping: {
              isin: 'US0378331005',
              provider: 'fmp',
              providerSymbol: 'AAPL',
              updatedAt: '2026-04-17T10:00:00.000Z',
            },
            resolutionStatus: {
              isin: 'US0378331005',
              provider: 'fmp',
              status: 'resolved',
              resolvedSymbol: 'AAPL',
              resolutionMethod: 'manual',
              confidence: 'high',
              message: null,
              evidence: null,
              fetchedAt: '2026-04-17T10:00:00.000Z',
              noCandidates: false,
              lastErrorCode: null,
              lastErrorMessage: null,
              updatedAt: '2026-04-17T10:00:00.000Z',
            },
            riskMetricSyncStatus: null,
            status: 'resolved',
          },
        },
      ],
      riskMappingSummary: {
        unresolvedCurrentHoldingsCount: 0,
      },
    });
  });

  it('throws when listing fails', async () => {
    listCategorizedInstrumentsMock.mockResolvedValue({
      isErr: () => true,
      error: { message: 'db failed' },
    });
    getHistoricalOrdersForWebMock.mockResolvedValue({
      isErr: () => false,
      value: { items: [] },
    });
    getAppCapabilitiesMock.mockResolvedValue({
      isErr: () => false,
      value: {
        hasBrokerCredentials: false,
        canSyncOrders: false,
        canSyncPortfolioState: false,
        canPlaceOrders: false,
        hasFmpApiKey: false,
        canSyncRiskMetrics: false,
        brokerAccessMode: 'missing',
        hasHistoricalOrders: false,
        hasCurrentHoldings: false,
        hasCategories: false,
        hasStoredRiskMetrics: false,
        hasSuccessfulSubmittedOrderAttempt: false,
        lastOrdersSyncAt: null,
        lastPortfolioSyncAt: null,
        lastRiskMetricsSyncAt: null,
      },
    });
    getLatestCurrentPositionSnapshotMock.mockResolvedValue({
      isErr: () => false,
      value: undefined,
    });
    listInstrumentProviderSymbolsMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    listInstrumentProviderResolutionStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    listInstrumentProviderResolutionCandidatesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    listInstrumentRiskMetricSyncStatusesMock.mockResolvedValue({
      isErr: () => false,
      value: [],
    });
    getLatestInstrumentRiskMetricMock.mockResolvedValue({
      isErr: () => false,
      value: undefined,
    });

    const { getCategoryManagementAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getCategoryManagementAction()).rejects.toThrow('db failed');
  });

  it('sets categories and returns result', async () => {
    const result = { isins: ['US0378331005'], category: 'growth' };
    setInstrumentCategoriesMock.mockResolvedValue({
      isErr: () => false,
      value: result,
    });

    const { setInstrumentCategoriesAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(
      setInstrumentCategoriesAction({
        isins: ['US0378331005'],
        category: ' Growth ',
      }),
    ).resolves.toEqual(result);
  });

  it('validates set input', async () => {
    const { setInstrumentCategoriesAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(
      setInstrumentCategoriesAction({ isins: [], category: 'growth' }),
    ).rejects.toThrow('Select at least one instrument.');
    await expect(
      setInstrumentCategoriesAction({ isins: ['US0378331005'], category: ' ' }),
    ).rejects.toThrow('Category is required.');
  });

  it('unsets categories and validates input', async () => {
    const result = { isins: ['US0378331005'] };
    unsetInstrumentCategoriesMock.mockResolvedValue({
      isErr: () => false,
      value: result,
    });

    const { unsetInstrumentCategoriesAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(
      unsetInstrumentCategoriesAction({ isins: ['US0378331005'] }),
    ).resolves.toEqual(result);
    await expect(unsetInstrumentCategoriesAction({ isins: [] })).rejects.toThrow(
      'Select at least one instrument.',
    );
  });

  it('refreshes provider mapping suggestions', async () => {
    resolveInstrumentProviderMappingsMock.mockResolvedValue({
      isErr: () => false,
      value: {
        processed: 1,
        resolved: 1,
        ambiguous: 0,
        unresolved: 0,
        failed: 0,
        skippedFresh: 0,
        skippedCooldown: 0,
        rateLimited: false,
      },
    });

    const { refreshInstrumentProviderMappingsAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(
      refreshInstrumentProviderMappingsAction({ isins: ['US0378331005'] }),
    ).resolves.toEqual({
      processed: 1,
      resolved: 1,
      ambiguous: 0,
      unresolved: 0,
      failed: 0,
      skippedFresh: 0,
      skippedCooldown: 0,
      rateLimited: false,
    });
  });

  it('confirms and clears provider resolution', async () => {
    confirmInstrumentProviderResolutionMock.mockResolvedValue({
      isErr: () => false,
      value: {
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
      },
    });
    clearInstrumentProviderResolutionMock.mockResolvedValue({
      isErr: () => false,
      value: {
        isin: 'US0378331005',
        provider: 'fmp',
      },
    });

    const {
      clearInstrumentProviderResolutionAction,
      confirmInstrumentProviderResolutionAction,
    } = await import('@/actions/instrument-categories-action');

    await expect(
      confirmInstrumentProviderResolutionAction({
        isin: 'US0378331005',
        providerSymbol: 'AAPL',
      }),
    ).resolves.toEqual({
      isin: 'US0378331005',
      provider: 'fmp',
      providerSymbol: 'AAPL',
    });
    await expect(
      clearInstrumentProviderResolutionAction({
        isin: 'US0378331005',
      }),
    ).resolves.toEqual({
      isin: 'US0378331005',
      provider: 'fmp',
    });
  });
});
