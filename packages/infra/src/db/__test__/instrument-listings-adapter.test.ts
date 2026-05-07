import type { HistoricalOrdersItem } from '@portfolio/domain';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('instrument listing db adapter', () => {
  test('saves historical orders where two traded tickers share one ISIN', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 1,
          ticker: 'XLEPl_EQ',
          fillId: 10,
        }),
        historicalOrder({
          id: 2,
          ticker: 'XLESl_EQ',
          fillId: 20,
        }),
      ]),
    );

    const result = await unwrap(dataManager.getHistoricalOrdersForWeb());

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.ticker).sort()).toEqual([
      'XLEPl_EQ',
      'XLESl_EQ',
    ]);
    expect(new Set(result.items.map((item) => item.instrument.isin))).toEqual(
      new Set(['IE00B435CG94']),
    );
  });

  test('saves multiple fills for a single order id', async () => {
    const { sqlite, dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 1,
          ticker: 'CSH2l_EQ',
          fillId: 10,
          fillQuantity: 6.57363843,
          fillPrice: 123020,
          fillWalletNetValue: 8086.89,
          fillWalletFxRate: 100,
        }),
        historicalOrder({
          id: 1,
          ticker: 'CSH2l_EQ',
          fillId: 11,
          fillQuantity: 0.74245655,
          fillPrice: 123020,
          fillWalletNetValue: 913.37,
          fillWalletFxRate: 100,
        }),
        historicalOrder({
          id: 1,
          ticker: 'CSH2l_EQ',
          fillId: 12,
          fillQuantity: 2.43841967,
          fillPrice: 123020,
          fillWalletNetValue: 2999.74,
          fillWalletFxRate: 100,
        }),
      ]),
    );

    const result = await unwrap(dataManager.getHistoricalOrdersForWeb());
    const storedFills = sqlite
      .prepare('select id, order_id from fills where order_id = 1 order by id')
      .all();

    expect(result.items).toHaveLength(1);
    expect(storedFills).toHaveLength(3);
    expect(storedFills).toEqual([
      { id: 10, order_id: 1 },
      { id: 11, order_id: 1 },
      { id: 12, order_id: 1 },
    ]);
    expect(result.items[0]?.fills).toHaveLength(3);
  });

  test('dedupes instruments by ISIN and prefers latest current position ticker', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 1,
          ticker: 'XLEPl_EQ',
          fillId: 10,
        }),
        historicalOrder({
          id: 2,
          ticker: 'XLESl_EQ',
          fillId: 20,
        }),
      ]),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00B435CG94',
        providerSymbol: 'XLESl_EQ',
        quantity: 1,
        currentPrice: 10,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 10,
        totalCost: 8,
        unrealizedProfitLoss: 2,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );
    await unwrap(dataManager.setInstrumentCategory('IE00B435CG94', 'energy'));

    const listed = await unwrap(dataManager.listCategorizedInstruments());

    expect(listed).toEqual([
      {
        ticker: 'XLESl_EQ',
        name: 'Invesco Energy S&P US Select Sector (Acc)',
        isin: 'IE00B435CG94',
        currency: 'GBP',
        category: 'energy',
      },
    ]);
  });

  test('category lookup can match any listing ticker for the same ISIN', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 1,
          ticker: 'XLEPl_EQ',
          fillId: 10,
        }),
        historicalOrder({
          id: 2,
          ticker: 'XLESl_EQ',
          fillId: 20,
        }),
      ]),
    );

    const oldListing = await unwrap(
      dataManager.findInstrumentCategoryInstrumentMatches('XLEP'),
    );
    const newListing = await unwrap(
      dataManager.findInstrumentCategoryInstrumentMatches('XLES'),
    );

    expect(oldListing).toHaveLength(1);
    expect(newListing).toHaveLength(1);
    expect(oldListing[0]?.isin).toBe('IE00B435CG94');
    expect(newListing[0]?.isin).toBe('IE00B435CG94');
  });

  test('catalog sync does not add catalog-only instruments to portfolio reads', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveT212InstrumentCatalogItems([
        {
          ticker: 'RANDO_US_EQ',
          isin: 'US0000000001',
          name: 'Random Catalog Stock',
          shortName: null,
          instrumentType: 'STOCK',
          currencyCode: 'USD',
          extendedHours: false,
          maxOpenQuantity: null,
          addedOn: null,
          fetchedAt: '2026-04-20T10:00:00.000Z',
        },
      ]),
    );

    await expect(unwrap(dataManager.getDistinctInstruments())).resolves.toEqual([]);
    await expect(
      unwrap(dataManager.findInstrumentCategoryInstrumentMatches('RANDO')),
    ).resolves.toEqual([]);
    await expect(
      unwrap(dataManager.findT212InstrumentCatalogMatches('RANDO')),
    ).resolves.toHaveLength(1);
  });

  test('current position observed listing appears in portfolio reads', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'VUAGl_EQ',
        name: 'Vanguard S&P 500',
        isin: 'IE00BFMXXD54',
        currency: 'GBP',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAGl_EQ',
        quantity: 1,
        currentPrice: 100,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 100,
        totalCost: 90,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );

    await expect(unwrap(dataManager.getDistinctInstruments())).resolves.toEqual([
      {
        ticker: 'VUAGl_EQ',
        name: 'Vanguard S&P 500',
        isin: 'IE00BFMXXD54',
        currency: 'GBP',
      },
    ]);
  });

  test('latest coherent portfolio snapshot ignores stale sold positions', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 300,
        totalCost: 250,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 50,
        totalValue: 300,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAGl_EQ',
        quantity: 1,
        currentPrice: 100,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 100,
        totalCost: 90,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BK5BR626',
        providerSymbol: 'VHYGl_EQ',
        quantity: 2,
        currentPrice: 100,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 200,
        totalCost: 160,
        unrealizedProfitLoss: 40,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );

    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 105,
        totalCost: 90,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 15,
        totalValue: 105,
        asOf: '2026-04-21T10:00:00.000Z',
        fetchedAt: '2026-04-21T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAGl_EQ',
        quantity: 1,
        currentPrice: 105,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 105,
        totalCost: 90,
        unrealizedProfitLoss: 15,
        fxImpact: null,
        asOf: '2026-04-21T10:00:00.000Z',
        fetchedAt: '2026-04-21T10:00:00.000Z',
      }),
    );

    await expect(
      unwrap(dataManager.getLatestPortfolioSnapshotAsOf()),
    ).resolves.toBe('2026-04-21T10:00:00.000Z');
    await expect(
      unwrap(
        dataManager.getLatestCurrentPortfolioPositionSnapshotByIsin(
          'IE00BFMXXD54',
        ),
      ),
    ).resolves.toMatchObject({
      isin: 'IE00BFMXXD54',
      currentValue: 105,
      asOf: '2026-04-21T10:00:00.000Z',
    });
    await expect(
      unwrap(
        dataManager.getLatestCurrentPortfolioPositionSnapshotByIsin(
          'IE00BK5BR626',
        ),
      ),
    ).resolves.toBeUndefined();
    await expect(
      unwrap(dataManager.getLatestCurrentPositionSnapshotByIsin('IE00BK5BR626')),
    ).resolves.toMatchObject({
      isin: 'IE00BK5BR626',
      currentValue: 200,
      asOf: '2026-04-20T10:00:00.000Z',
    });
  });

  test('prunes portfolio-state snapshots older than 90 days cutoff', async () => {
    const { sqlite, dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 50,
        totalCost: 40,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 10,
        totalValue: 50,
        asOf: '2025-12-31T10:00:00.000Z',
        fetchedAt: '2025-12-31T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BFMXXD54',
        providerSymbol: 'VUAGl_EQ',
        quantity: 1,
        currentPrice: 50,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 50,
        totalCost: 40,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2025-12-31T10:00:00.000Z',
        fetchedAt: '2025-12-31T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 100,
        totalCost: 90,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 10,
        totalValue: 100,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00BK5BR626',
        providerSymbol: 'VHYGl_EQ',
        quantity: 1,
        currentPrice: 100,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 100,
        totalCost: 90,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );

    await unwrap(
      dataManager.prunePortfolioStateSnapshotsOlderThan(
        '2026-01-20T10:00:00.000Z',
      ),
    );

    const remainingSummaryAsOfs = sqlite
      .prepare(
        'select as_of from account_summary_snapshots order by as_of',
      )
      .all()
      .map((row: { as_of: string }) => row.as_of);
    const remainingPositionAsOfs = sqlite
      .prepare(
        'select as_of from current_position_snapshots order by as_of',
      )
      .all()
      .map((row: { as_of: string }) => row.as_of);

    expect(remainingSummaryAsOfs).toEqual(['2026-04-20T10:00:00.000Z']);
    expect(remainingPositionAsOfs).toEqual(['2026-04-20T10:00:00.000Z']);
  });

  test('returns app data state from stored rows', async () => {
    const { sqlite, dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 1,
          ticker: 'XLEPl_EQ',
          fillId: 10,
        }),
      ]),
    );
    await unwrap(
      dataManager.setInstrumentCategory('IE00B435CG94', 'energy'),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'IE00B435CG94',
        providerSymbol: 'XLEPl_EQ',
        quantity: 1,
        currentPrice: 10,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 10,
        totalCost: 8,
        unrealizedProfitLoss: 2,
        fxImpact: null,
        asOf: '2026-04-20T10:00:00.000Z',
        fetchedAt: '2026-04-20T10:00:00.000Z',
      }),
    );
    sqlite.exec(`
      insert into account_summary_snapshots(
        currency,
        current_value,
        total_cost,
        realized_profit_loss,
        unrealized_profit_loss,
        total_value,
        as_of,
        fetched_at
      )
      values(
        'GBP',
        10,
        8,
        0,
        2,
        10,
        '2026-04-20T10:00:00.000Z',
        '2026-04-20T10:00:00.000Z'
      );

      insert into instrument_risk_metrics(
        isin,
        provider,
        provider_symbol,
        beta,
        source_type,
        as_of,
        fetched_at
      )
      values(
        'IE00B435CG94',
        'fmp',
        'XLEP',
        0.9,
        'profile',
        '2026-04-20T10:00:00.000Z',
        '2026-04-20T10:05:00.000Z'
      );

      insert into order_execution_attempts(
        order_type,
        environment,
        instrument_input,
        resolved_ticker,
        resolved_isin,
        resolved_name,
        side,
        requested_mode,
        requested_quantity,
        derived_quantity,
        extended_hours,
        execution_mode,
        broker_request_payload,
        attempted_at
      )
      values(
        'market',
        'live',
        'XLEP',
        'XLEPl_EQ',
        'IE00B435CG94',
        'Invesco Energy S&P US Select Sector (Acc)',
        'buy',
        'quantity',
        1,
        1,
        0,
        'submitted',
        '{}',
        '2026-04-20T10:10:00.000Z'
      );
    `);

    const result = await unwrap(dataManager.getAppDataState());

    expect(result).toEqual({
      hasHistoricalOrders: true,
      hasCurrentHoldings: true,
      hasCategories: true,
      hasStoredRiskMetrics: true,
      hasSuccessfulSubmittedOrderAttempt: true,
      lastOrdersSyncAt: null,
      lastPortfolioSyncAt: '2026-04-20T10:00:00.000Z',
      lastRiskMetricsSyncAt: '2026-04-20T10:05:00.000Z',
    });
  });

  test('builds current holding movers from fills and T212 snapshots', async () => {
    const { dataManager } = await createTestDataManager();

    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'AAA_EQ',
        name: 'AAA Fund',
        isin: 'AAA',
        currency: 'GBP',
      }),
    );
    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'BBB_EQ',
        name: 'BBB Fund',
        isin: 'BBB',
        currency: 'USD',
      }),
    );
    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'OLD_EQ',
        name: 'Old Fund',
        isin: 'OLD',
        currency: 'GBP',
      }),
    );
    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'MISS_EQ',
        name: 'Missing Fund',
        isin: 'MISS',
        currency: 'GBP',
      }),
    );
    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'ADD_EQ',
        name: 'Added Fund',
        isin: 'ADD',
        currency: 'GBP',
      }),
    );
    await unwrap(
      dataManager.saveObservedInstrumentListing({
        ticker: 'SELL_EQ',
        name: 'Sold Down Fund',
        isin: 'SELL',
        currency: 'GBP',
      }),
    );
    await unwrap(dataManager.setInstrumentCategory('AAA', 'growth'));
    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 100,
          ticker: 'AAA_EQ',
          fillId: 1000,
          fillQuantity: 2,
          fillPrice: 10,
          fillWalletNetValue: 20,
          isin: 'AAA',
          name: 'AAA Fund',
          createdAt: '2026-04-01T10:00:00.000Z',
          filledAt: '2026-04-01T10:01:00.000Z',
        }),
        historicalOrder({
          id: 101,
          ticker: 'BBB_EQ',
          fillId: 1001,
          fillQuantity: 3,
          fillPrice: 30,
          fillWalletFxRate: 4 / 3,
          fillWalletNetValue: 67.5,
          isin: 'BBB',
          name: 'BBB Fund',
          currency: 'USD',
          createdAt: '2026-04-01T10:00:00.000Z',
          filledAt: '2026-04-01T10:01:00.000Z',
        }),
        historicalOrder({
          id: 102,
          ticker: 'ADD_EQ',
          fillId: 1002,
          fillQuantity: 2,
          fillPrice: 10,
          fillWalletNetValue: 20,
          isin: 'ADD',
          name: 'Added Fund',
          createdAt: '2026-04-05T10:00:00.000Z',
          filledAt: '2026-04-05T10:01:00.000Z',
        }),
        historicalOrder({
          id: 103,
          ticker: 'SELL_EQ',
          fillId: 1003,
          fillQuantity: 3,
          fillPrice: 10,
          fillWalletNetValue: 30,
          isin: 'SELL',
          name: 'Sold Down Fund',
          createdAt: '2026-04-01T10:00:00.000Z',
          filledAt: '2026-04-01T10:01:00.000Z',
        }),
        historicalOrder({
          id: 104,
          ticker: 'SELL_EQ',
          fillId: 1004,
          fillQuantity: 1,
          fillPrice: 12,
          fillWalletNetValue: 12,
          isin: 'SELL',
          name: 'Sold Down Fund',
          side: 'SELL',
          createdAt: '2026-04-06T10:00:00.000Z',
          filledAt: '2026-04-06T10:01:00.000Z',
        }),
      ]),
    );
    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 30,
        totalCost: 25,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 5,
        totalValue: 30,
        asOf: '2026-04-01T10:00:00.000Z',
        fetchedAt: '2026-04-01T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'OLD',
        providerSymbol: 'OLD_EQ',
        quantity: 1,
        currentPrice: 30,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 25,
        unrealizedProfitLoss: 5,
        fxImpact: null,
        asOf: '2026-04-01T10:00:00.000Z',
        fetchedAt: '2026-04-01T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveAccountSummarySnapshot({
        currency: 'GBP',
        currentValue: 225,
        totalCost: 200,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 25,
        totalValue: 225,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'AAA',
        providerSymbol: 'AAA_EQ',
        quantity: 2,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'BBB',
        providerSymbol: 'BBB_EQ',
        quantity: 3,
        currentPrice: 20,
        instrumentCurrency: 'USD',
        walletCurrency: 'GBP',
        currentValue: 45,
        totalCost: 50,
        unrealizedProfitLoss: -5,
        fxImpact: null,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'MISS',
        providerSymbol: 'MISS_EQ',
        quantity: 1,
        currentPrice: 5,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 5,
        totalCost: 5,
        unrealizedProfitLoss: 0,
        fxImpact: null,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'ADD',
        providerSymbol: 'ADD_EQ',
        quantity: 2,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'SELL',
        providerSymbol: 'SELL_EQ',
        quantity: 2,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-10T10:00:00.000Z',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'AAA',
        providerSymbol: 'AAA_EQ',
        quantity: 2,
        averagePricePaid: 10,
        currentPrice: 10,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 20,
        totalCost: 20,
        unrealizedProfitLoss: 0,
        fxImpact: null,
        asOf: '2026-04-04T10:00:00.000Z',
        fetchedAt: '2026-04-04T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'AAA',
        providerSymbol: 'AAA_EQ',
        quantity: 2,
        averagePricePaid: 10,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'BBB',
        providerSymbol: 'BBB_EQ',
        quantity: 3,
        averagePricePaid: 28,
        currentPrice: 30,
        instrumentCurrency: 'USD',
        walletCurrency: 'GBP',
        currentValue: 67.5,
        totalCost: 63,
        unrealizedProfitLoss: 5,
        fxImpact: null,
        asOf: '2026-04-03T10:00:00.000Z',
        fetchedAt: '2026-04-03T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'BBB',
        providerSymbol: 'BBB_EQ',
        quantity: 3,
        averagePricePaid: 28,
        currentPrice: 20,
        instrumentCurrency: 'USD',
        walletCurrency: 'GBP',
        currentValue: 45,
        totalCost: 63,
        unrealizedProfitLoss: -17.5,
        fxImpact: null,
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'ADD',
        providerSymbol: 'ADD_EQ',
        quantity: 2,
        currentPrice: 10,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 20,
        totalCost: 20,
        unrealizedProfitLoss: 0,
        fxImpact: null,
        asOf: '2026-04-05T10:02:00.000Z',
        fetchedAt: '2026-04-05T10:02:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'ADD',
        providerSymbol: 'ADD_EQ',
        quantity: 2,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'SELL',
        providerSymbol: 'SELL_EQ',
        quantity: 3,
        currentPrice: 10,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 30,
        unrealizedProfitLoss: 0,
        fxImpact: null,
        asOf: '2026-04-04T10:00:00.000Z',
        fetchedAt: '2026-04-04T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveCurrentPositionSnapshot({
        isin: 'SELL',
        providerSymbol: 'SELL_EQ',
        quantity: 2,
        currentPrice: 15,
        instrumentCurrency: 'GBP',
        walletCurrency: 'GBP',
        currentValue: 30,
        totalCost: 20,
        unrealizedProfitLoss: 10,
        fxImpact: null,
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );

    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'AAA',
        provider: 'eodhd',
        providerSymbol: 'AAA',
        currency: 'GBP',
        price: 1,
        priceType: 'eod',
        asOf: '2026-04-03',
        fetchedAt: '2026-04-03T09:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'AAA',
        provider: 't212',
        providerSymbol: 'AAA_EQ',
        currency: 'GBP',
        price: 10,
        priceType: 'position_current',
        asOf: '2026-04-04T10:00:00.000Z',
        fetchedAt: '2026-04-04T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'AAA',
        provider: 't212',
        providerSymbol: 'AAA_EQ',
        currency: 'GBP',
        price: 12,
        priceType: 'position_current',
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'AAA',
        provider: 'manual',
        providerSymbol: 'AAA_EQ',
        currency: 'GBP',
        price: 15,
        priceType: 'manual',
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T11:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'BBB',
        provider: 't212',
        providerSymbol: 'BBB_EQ',
        currency: 'USD',
        price: 30,
        priceType: 'position_current',
        asOf: '2026-04-03T10:00:00.000Z',
        fetchedAt: '2026-04-03T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'BBB',
        provider: 't212',
        providerSymbol: 'BBB_EQ',
        currency: 'USD',
        price: 20,
        priceType: 'position_current',
        asOf: '2026-04-09T10:00:00.000Z',
        fetchedAt: '2026-04-09T10:00:00.000Z',
      }),
    );
    await unwrap(
      dataManager.saveInstrumentPriceSnapshot({
        isin: 'MISS',
        provider: 't212',
        providerSymbol: 'MISS_EQ',
        currency: 'GBP',
        price: 0,
        priceType: 'position_current',
        asOf: '2026-04-03T10:00:00.000Z',
        fetchedAt: '2026-04-03T10:00:00.000Z',
      }),
    );

    const result = await unwrap(
      dataManager.getCurrentHoldingMovers({
        filledFrom: '2026-04-03',
        filledTo: '2026-04-09',
      }),
    );

    expect(result.excludedCount).toBe(1);
    expect(result.items.map((item) => item.instrument.isin).sort()).toEqual([
      'AAA',
      'ADD',
      'BBB',
      'SELL',
    ]);
    expect(result.items.find((item) => item.instrument.isin === 'OLD')).toBeUndefined();
    expect(result.items.find((item) => item.instrument.isin === 'AAA')).toMatchObject({
      instrument: {
        ticker: 'AAA_EQ',
        category: 'growth',
      },
      startPrice: {
        price: 10,
        asOf: '2026-04-04T10:00:00.000Z',
      },
      endPrice: {
        price: 15,
        provider: 't212',
      },
      priceChange: 5,
      returnPercent: 0.5,
      walletImpact: 10,
    });
    expect(result.items.find((item) => item.instrument.isin === 'BBB')).toMatchObject({
      priceChange: -10,
      returnPercent: -1 / 3,
      walletImpact: -22.5,
    });
    expect(result.items.find((item) => item.instrument.isin === 'ADD')).toMatchObject({
      priceChange: 5,
      returnPercent: 0.5,
      walletImpact: 10,
    });
    expect(result.items.find((item) => item.instrument.isin === 'SELL')).toMatchObject({
      priceChange: 5,
      returnPercent: 0.5,
      walletImpact: 12,
    });
  });
});

describe('instrument listing migration', () => {
  test('migrates old ticker-keyed instruments and accepts a new same-ISIN listing', async () => {
    const { sqlite, dataManager } = await createLegacyDbAndMigrate();

    await unwrap(
      dataManager.saveHistoricalOrders([
        historicalOrder({
          id: 2,
          ticker: 'XLESl_EQ',
          fillId: 20,
        }),
      ]),
    );

    const fkRows = sqlite.prepare('PRAGMA foreign_key_check').all();
    const listings = sqlite
      .prepare('select ticker, isin from instrument_listings order by ticker')
      .all();

    expect(fkRows).toEqual([]);
    expect(listings).toEqual([
      { ticker: 'XLEPl_EQ', isin: 'IE00B435CG94' },
      { ticker: 'XLESl_EQ', isin: 'IE00B435CG94' },
    ]);
  });

  test('cleans catalog-only listings and keeps order/current-position listings', async () => {
    const sqlite = createEmptyDb();
    sqlite.exec(`
      insert into instruments(isin, name, currency)
      values
        ('US0000000001', 'Random Catalog Stock', 'USD'),
        ('IE00B435CG94', 'Invesco Energy S&P US Select Sector (Acc)', 'GBP');

      insert into instrument_listings(ticker, isin, provider, name, currency)
      values
        ('RANDO_US_EQ', 'US0000000001', 't212', 'Random Catalog Stock', 'USD'),
        ('XLEPl_EQ', 'IE00B435CG94', 't212', 'Invesco Energy S&P US Select Sector (Acc)', 'GBP');

      insert into orders(
        id,
        strategy,
        type,
        ticker,
        status,
        currency,
        extended_hours,
        initiated_from,
        side,
        created_at
      )
      values (
        1,
        'MANUAL',
        'MARKET',
        'XLEPl_EQ',
        'FILLED',
        'GBP',
        0,
        'WEB',
        'BUY',
        '2026-04-17T10:00:00.000Z'
      );

      insert into t212_instrument_catalog(
        ticker,
        isin,
        name,
        currency_code,
        extended_hours,
        fetched_at
      )
      values (
        'VUAGl_EQ',
        'IE00BFMXXD54',
        'Vanguard S&P 500',
        'GBP',
        0,
        '2026-04-20T10:00:00.000Z'
      );

      insert into current_position_snapshots(
        isin,
        provider_symbol,
        quantity,
        current_price,
        instrument_currency,
        wallet_currency,
        current_value,
        total_cost,
        unrealized_profit_loss,
        as_of,
        fetched_at
      )
      values (
        'IE00BFMXXD54',
        'VUAGl_EQ',
        1,
        100,
        'GBP',
        'GBP',
        100,
        90,
        10,
        '2026-04-20T10:00:00.000Z',
        '2026-04-20T10:00:00.000Z'
      );
    `);

    runMigration(sqlite, 'drizzle/0014_clean_portfolio_instrument_universe.sql');

    const fkRows = sqlite.prepare('PRAGMA foreign_key_check').all();
    const listings = sqlite
      .prepare('select ticker, isin from instrument_listings order by ticker')
      .all();
    const instruments = sqlite
      .prepare('select isin, name from instruments order by isin')
      .all();

    expect(fkRows).toEqual([]);
    expect(listings).toEqual([
      { ticker: 'VUAGl_EQ', isin: 'IE00BFMXXD54' },
      { ticker: 'XLEPl_EQ', isin: 'IE00B435CG94' },
    ]);
    expect(instruments).toEqual([
      { isin: 'IE00B435CG94', name: 'Invesco Energy S&P US Select Sector (Acc)' },
      { isin: 'IE00BFMXXD54', name: 'Vanguard S&P 500' },
    ]);
  });
});

async function createTestDataManager() {
  const sqlite = createEmptyDb();
  const { createBrokerDataManager } = await import('../index');
  return {
    sqlite,
    dataManager: createBrokerDataManager(drizzle(sqlite)),
  };
}

async function createLegacyDbAndMigrate() {
  const sqlite = createDbFile();
  sqlite.exec(`
    create table instruments (
      ticker text primary key not null,
      name text not null,
      isin text not null,
      currency text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create unique index instruments_isin_idx on instruments(isin);

    create table orders (
      id integer primary key not null,
      strategy text not null,
      type text not null,
      ticker text not null references instruments(ticker),
      quantity real,
      filled_quantity real,
      value real,
      filled_value real,
      limit_price real,
      status text not null,
      currency text not null,
      extended_hours integer not null,
      initiated_from text not null,
      side text not null,
      created_at text not null
    );
    create index orders_ticker_idx on orders(ticker);
    create index orders_created_at_idx on orders(created_at);

    create table fills (
      id integer primary key not null,
      order_id integer not null references orders(id),
      quantity real not null,
      price real not null,
      type text not null,
      trading_method text not null,
      filled_at text not null,
      wallet_currency text not null,
      wallet_net_value real not null,
      wallet_fx_rate real not null
    );
    create table fill_taxes (
      id integer primary key autoincrement,
      fill_id integer not null references fills(id),
      name text not null,
      quantity real not null,
      currency text not null,
      charged_at text not null
    );
    create table t212_instrument_catalog (
      ticker text primary key not null,
      isin text not null,
      name text not null,
      short_name text,
      instrument_type text,
      currency_code text not null,
      extended_hours integer not null,
      max_open_quantity real,
      added_on text,
      fetched_at text not null,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    insert into instruments(ticker, name, isin, currency)
    values (
      'XLEPl_EQ',
      'Invesco Energy S&P US Select Sector (Acc)',
      'IE00B435CG94',
      'GBP'
    );
    insert into orders(
      id,
      strategy,
      type,
      ticker,
      status,
      currency,
      extended_hours,
      initiated_from,
      side,
      created_at
    )
    values (
      1,
      'MANUAL',
      'MARKET',
      'XLEPl_EQ',
      'FILLED',
      'GBP',
      0,
      'WEB',
      'BUY',
      '2026-04-17T10:00:00.000Z'
    );
  `);

  runMigration(sqlite, 'drizzle/0013_outgoing_wither.sql');
  createPostMigrationSupportTables(sqlite);

  const { createBrokerDataManager } = await import('../index');
  return {
    sqlite,
    dataManager: createBrokerDataManager(drizzle(sqlite)),
  };
}

function createEmptyDb() {
  const sqlite = createDbFile();
  sqlite.exec(`
    create table instruments (
      isin text primary key not null,
      name text not null,
      currency text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create table instrument_listings (
      ticker text primary key not null,
      isin text not null references instruments(isin),
      provider text not null default 't212',
      name text not null,
      currency text not null,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create table orders (
      id integer primary key not null,
      strategy text not null,
      type text not null,
      ticker text not null references instrument_listings(ticker),
      quantity real,
      filled_quantity real,
      value real,
      filled_value real,
      limit_price real,
      status text not null,
      currency text not null,
      extended_hours integer not null,
      initiated_from text not null,
      side text not null,
      created_at text not null
    );
    create table fills (
      id integer primary key not null,
      order_id integer not null references orders(id),
      quantity real not null,
      price real not null,
      type text not null,
      trading_method text not null,
      filled_at text not null,
      wallet_currency text not null,
      wallet_net_value real not null,
      wallet_fx_rate real not null
    );
    create table fill_taxes (
      id integer primary key autoincrement,
      fill_id integer not null references fills(id),
      name text not null,
      quantity real not null,
      currency text not null,
      charged_at text not null
    );
  `);
  createPostMigrationSupportTables(sqlite);
  return sqlite;
}

function createPostMigrationSupportTables(sqlite: Database.Database) {
  sqlite.exec(`
    create table if not exists instrument_categories (
      isin text primary key not null,
      category text not null,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists current_position_snapshots (
      id integer primary key autoincrement,
      isin text not null,
      provider_symbol text not null,
      quantity real not null,
      average_price_paid real,
      current_price real not null,
      instrument_currency text not null,
      wallet_currency text not null,
      current_value real not null,
      total_cost real not null,
      unrealized_profit_loss real not null,
      fx_impact real,
      as_of text not null,
      fetched_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists t212_instrument_catalog (
      ticker text primary key not null,
      isin text not null,
      name text not null,
      short_name text,
      instrument_type text,
      currency_code text not null,
      extended_hours integer not null,
      max_open_quantity real,
      added_on text,
      fetched_at text not null,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists account_summary_snapshots (
      id integer primary key autoincrement,
      currency text not null,
      current_value real not null,
      total_cost real not null,
      realized_profit_loss real not null,
      unrealized_profit_loss real not null,
      total_value real not null,
      as_of text not null,
      fetched_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists sync_state (
      key text primary key,
      next_page_path text,
      backfill_completed integer not null default 0,
      rate_limit_limit integer,
      rate_limit_period_sec integer,
      rate_limit_remaining integer,
      rate_limit_reset_epoch integer,
      rate_limit_used integer,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists instrument_risk_metrics (
      id integer primary key autoincrement,
      isin text not null,
      provider text not null,
      provider_symbol text not null,
      beta real not null,
      source_type text not null,
      as_of text not null,
      fetched_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists instrument_prices (
      id integer primary key autoincrement,
      isin text not null,
      provider text not null,
      provider_symbol text not null,
      currency text not null,
      price real not null,
      price_type text not null,
      as_of text not null,
      fetched_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create table if not exists order_execution_attempts (
      id integer primary key autoincrement,
      order_type text not null default 'market',
      environment text not null,
      instrument_input text not null,
      resolved_ticker text not null,
      resolved_isin text not null,
      resolved_name text not null,
      side text not null,
      requested_mode text not null,
      requested_quantity real,
      requested_value real,
      derived_quantity real not null,
      reference_price real,
      extended_hours integer not null,
      limit_price real,
      time_validity text,
      execution_mode text not null,
      broker_request_payload text not null,
      broker_response_payload text,
      error_code text,
      error_message text,
      attempted_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
  `);
}

function createDbFile() {
  const dir = mkdtempSync(
    path.join(tmpdir(), 'portfolio-instrument-listings-'),
  );
  const dbPath = path.join(dir, 'test.sqlite');
  process.env.SQLITE_DB = dbPath;
  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

function runMigration(sqlite: Database.Database, migrationPath: string) {
  const sql = readFileSync(path.resolve(migrationPath), 'utf8');
  sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .forEach((statement) => {
      sqlite.exec(statement);
    });
}

function historicalOrder({
  id,
  ticker,
  fillId,
  fillQuantity = 1,
  fillPrice = 10,
  fillWalletNetValue = 10,
  fillWalletFxRate = 1,
  side = 'BUY',
  currency = 'GBP',
  createdAt = '2026-04-20T10:00:00.000Z',
  filledAt = '2026-04-20T10:01:00.000Z',
  isin = 'IE00B435CG94',
  name = 'Invesco Energy S&P US Select Sector (Acc)',
}: {
  id: number;
  ticker: string;
  fillId: number;
  fillQuantity?: number;
  fillPrice?: number;
  fillWalletNetValue?: number;
  fillWalletFxRate?: number;
  side?: 'BUY' | 'SELL';
  currency?: string;
  createdAt?: string;
  filledAt?: string;
  isin?: string;
  name?: string;
}): HistoricalOrdersItem {
  return {
    order: {
      id,
      strategy: 'MANUAL',
      type: 'MARKET',
      ticker,
      quantity: fillQuantity,
      filledQuantity: fillQuantity,
      value: fillWalletNetValue,
      filledValue: fillWalletNetValue,
      status: 'FILLED',
      currency,
      extendedHours: false,
      initiatedFrom: 'WEB',
      side,
      createdAt,
      instrument: {
        ticker,
        name,
        isin,
        currency,
      },
    },
    fill: {
      id: fillId,
      quantity: fillQuantity,
      price: fillPrice,
      type: 'MARKET',
      tradingMethod: 'CLASSIC',
      filledAt,
      walletImpact: {
        currency: 'GBP',
        netValue: fillWalletNetValue,
        fxRate: fillWalletFxRate,
        taxes: [],
      },
    },
  };
}

async function unwrap<T>(
  resultPromise: PromiseLike<
    { isOk(): true; value: T } | { isOk(): false; error: { message: string } }
  >,
) {
  const result = await resultPromise;

  if (result.isOk()) {
    return result.value;
  }

  throw new Error(result.error.message);
}
