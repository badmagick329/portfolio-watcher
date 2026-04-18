import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCategorizedInstrumentsMock = vi.fn();
const getHistoricalOrdersForWebMock = vi.fn();
const getLatestCurrentPositionSnapshotMock = vi.fn();
const getLatestInstrumentRiskMetricMock = vi.fn();
const setInstrumentCategoriesMock = vi.fn();
const unsetInstrumentCategoriesMock = vi.fn();

vi.mock('@/lib/server/composition', () => ({
  getHistoricalOrdersForWeb: getHistoricalOrdersForWebMock,
  getLatestCurrentPositionSnapshot: getLatestCurrentPositionSnapshotMock,
  getLatestInstrumentRiskMetric: getLatestInstrumentRiskMetricMock,
  listCategorizedInstruments: listCategorizedInstrumentsMock,
  setInstrumentCategories: setInstrumentCategoriesMock,
  unsetInstrumentCategories: unsetInstrumentCategoriesMock,
}));

describe('instrument category actions', () => {
  beforeEach(() => {
    getHistoricalOrdersForWebMock.mockReset();
    getLatestCurrentPositionSnapshotMock.mockReset();
    getLatestInstrumentRiskMetricMock.mockReset();
    listCategorizedInstrumentsMock.mockReset();
    setInstrumentCategoriesMock.mockReset();
    unsetInstrumentCategoriesMock.mockReset();
  });

  it('returns categorized instruments with current holding state', async () => {
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

    const { getInstrumentCategoriesAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getInstrumentCategoriesAction()).resolves.toEqual({
      historicalOrders: [
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
      instruments: [
        {
          ...rows[0],
          currentQuantity: 2,
          currentlyHeld: true,
          currentPositionSnapshot: {
            isin: 'US0378331005',
            quantity: 2,
            currentValue: 200,
            totalCost: 150,
            unrealizedProfitLoss: 50,
          },
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
        {
          ...rows[1],
          currentQuantity: 0,
          currentlyHeld: false,
          currentPositionSnapshot: null,
          riskMetric: null,
        },
      ],
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
    getLatestCurrentPositionSnapshotMock.mockResolvedValue({
      isErr: () => false,
      value: undefined,
    });
    getLatestInstrumentRiskMetricMock.mockResolvedValue({
      isErr: () => false,
      value: undefined,
    });

    const { getInstrumentCategoriesAction } = await import(
      '@/actions/instrument-categories-action'
    );

    await expect(getInstrumentCategoriesAction()).rejects.toThrow('db failed');
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
});
