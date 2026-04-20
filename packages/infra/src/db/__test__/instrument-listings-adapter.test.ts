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
      order_id integer not null unique references orders(id),
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
      order_id integer not null unique references orders(id),
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
}: {
  id: number;
  ticker: string;
  fillId: number;
}): HistoricalOrdersItem {
  return {
    order: {
      id,
      strategy: 'MANUAL',
      type: 'MARKET',
      ticker,
      quantity: 1,
      filledQuantity: 1,
      value: 10,
      filledValue: 10,
      status: 'FILLED',
      currency: 'GBP',
      extendedHours: false,
      initiatedFrom: 'WEB',
      side: 'BUY',
      createdAt: '2026-04-20T10:00:00.000Z',
      instrument: {
        ticker,
        name: 'Invesco Energy S&P US Select Sector (Acc)',
        isin: 'IE00B435CG94',
        currency: 'GBP',
      },
    },
    fill: {
      id: fillId,
      quantity: 1,
      price: 10,
      type: 'MARKET',
      tradingMethod: 'CLASSIC',
      filledAt: '2026-04-20T10:01:00.000Z',
      walletImpact: {
        currency: 'GBP',
        netValue: 10,
        fxRate: 1,
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
