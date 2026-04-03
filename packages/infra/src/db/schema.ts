import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const instruments = sqliteTable(
  'instruments',
  {
    ticker: text('ticker').primaryKey(),
    name: text('name').notNull(),
    isin: text('isin').notNull(),
    currency: text('currency').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('instruments_isin_idx').on(table.isin)],
);

const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey(),
    strategy: text('strategy').notNull(),
    type: text('type').notNull(),
    ticker: text('ticker')
      .notNull()
      .references(() => instruments.ticker),
    quantity: real('quantity'),
    filledQuantity: real('filled_quantity'),
    value: real('value'),
    filledValue: real('filled_value'),
    limitPrice: real('limit_price'),
    status: text('status').notNull(),
    currency: text('currency').notNull(),
    extendedHours: integer('extended_hours', { mode: 'boolean' }).notNull(),
    initiatedFrom: text('initiated_from').notNull(),
    side: text('side').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('orders_ticker_idx').on(table.ticker),
    index('orders_created_at_idx').on(table.createdAt),
  ],
);

const fills = sqliteTable(
  'fills',
  {
    id: integer('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .unique()
      .references(() => orders.id),
    quantity: real('quantity').notNull(),
    price: real('price').notNull(),
    type: text('type').notNull(),
    tradingMethod: text('trading_method').notNull(),
    filledAt: text('filled_at').notNull(),

    walletCurrency: text('wallet_currency').notNull(),
    walletNetValue: real('wallet_net_value').notNull(),
    walletFxRate: real('wallet_fx_rate').notNull(),
  },
  (table) => [
    index('fills_order_id_idx').on(table.orderId),
    index('fills_filled_at_idx').on(table.filledAt),
  ],
);

const fillTaxes = sqliteTable(
  'fill_taxes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fillId: integer('fill_id')
      .notNull()
      .references(() => fills.id),
    name: text('name').notNull(),
    quantity: real('quantity').notNull(),
    currency: text('currency').notNull(),
    chargedAt: text('charged_at').notNull(),
  },
  (table) => [
    index('fill_taxes_fill_id_idx').on(table.fillId),
    uniqueIndex('fill_taxes_unique_entry_idx').on(
      table.fillId,
      table.name,
      table.quantity,
      table.currency,
      table.chargedAt,
    ),
  ],
);

const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),

  nextPagePath: text('next_page_path'),
  backfillCompleted: integer('backfill_completed', { mode: 'boolean' })
    .notNull()
    .default(false),

  rateLimitLimit: integer('rate_limit_limit'),
  rateLimitPeriodSec: integer('rate_limit_period_sec'),
  rateLimitRemaining: integer('rate_limit_remaining'),
  rateLimitResetEpoch: integer('rate_limit_reset_epoch'),
  rateLimitUsed: integer('rate_limit_used'),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const instrumentPriceSources = sqliteTable(
  'instrument_price_sources',
  {
    isin: text('isin').primaryKey().notNull(),
    provider: text('provider').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    providerExchange: text('provider_exchange').notNull(),
    providerMic: text('provider_mic'),
    resolvedName: text('resolved_name').notNull(),
    resolvedCurrency: text('resolved_currency'),
    resolutionConfidence: real('resolution_confidence').notNull(),
    lastResolvedAt: text('last_resolved_at').notNull(),
    lastFetchStatus: text('last_fetch_status'),
    lastFetchError: text('last_fetch_error'),
    lastFetchAttemptedAt: text('last_fetch_attempted_at'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('instrument_price_sources_provider_idx').on(table.provider),
  ],
);

const instrumentPrices = sqliteTable(
  'instrument_prices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    isin: text('isin').notNull(),
    provider: text('provider').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    currency: text('currency').notNull(),
    price: real('price').notNull(),
    priceType: text('price_type').notNull(),
    asOf: text('as_of').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('instrument_prices_isin_idx').on(table.isin),
    index('instrument_prices_fetched_at_idx').on(table.fetchedAt),
    uniqueIndex('instrument_prices_unique_snapshot_idx').on(
      table.provider,
      table.isin,
      table.asOf,
    ),
  ],
);

const currentPositionSnapshots = sqliteTable(
  'current_position_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    isin: text('isin').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    quantity: real('quantity').notNull(),
    currentPrice: real('current_price').notNull(),
    instrumentCurrency: text('instrument_currency').notNull(),
    walletCurrency: text('wallet_currency').notNull(),
    currentValue: real('current_value').notNull(),
    totalCost: real('total_cost').notNull(),
    unrealizedProfitLoss: real('unrealized_profit_loss').notNull(),
    fxImpact: real('fx_impact'),
    asOf: text('as_of').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('current_position_snapshots_isin_idx').on(table.isin),
    index('current_position_snapshots_fetched_at_idx').on(table.fetchedAt),
    uniqueIndex('current_position_snapshots_unique_snapshot_idx').on(
      table.isin,
      table.asOf,
    ),
  ],
);

const accountSummarySnapshots = sqliteTable(
  'account_summary_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    currency: text('currency').notNull(),
    currentValue: real('current_value').notNull(),
    totalCost: real('total_cost').notNull(),
    realizedProfitLoss: real('realized_profit_loss').notNull(),
    unrealizedProfitLoss: real('unrealized_profit_loss').notNull(),
    totalValue: real('total_value').notNull(),
    asOf: text('as_of').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('account_summary_snapshots_fetched_at_idx').on(table.fetchedAt),
    uniqueIndex('account_summary_snapshots_unique_snapshot_idx').on(table.asOf),
  ],
);

type Instrument = typeof instruments.$inferSelect;
type NewInstrument = typeof instruments.$inferInsert;

type Order = typeof orders.$inferSelect;
type NewOrder = typeof orders.$inferInsert;

type Fill = typeof fills.$inferSelect;
type NewFill = typeof fills.$inferInsert;

type FillTaxes = typeof fillTaxes.$inferSelect;
type NewFillTaxes = typeof fillTaxes.$inferInsert;

type SyncState = typeof syncState.$inferSelect;
type NewSyncState = typeof syncState.$inferInsert;

type InstrumentPriceSource = typeof instrumentPriceSources.$inferSelect;
type NewInstrumentPriceSource = typeof instrumentPriceSources.$inferInsert;

type InstrumentPrice = typeof instrumentPrices.$inferSelect;
type NewInstrumentPrice = typeof instrumentPrices.$inferInsert;

type CurrentPositionSnapshot = typeof currentPositionSnapshots.$inferSelect;
type NewCurrentPositionSnapshot = typeof currentPositionSnapshots.$inferInsert;

type AccountSummarySnapshot = typeof accountSummarySnapshots.$inferSelect;
type NewAccountSummarySnapshot = typeof accountSummarySnapshots.$inferInsert;

export type {
  Instrument,
  NewInstrument,
  Order,
  NewOrder,
  Fill,
  NewFill,
  FillTaxes,
  NewFillTaxes,
  SyncState,
  NewSyncState,
  InstrumentPriceSource,
  NewInstrumentPriceSource,
  InstrumentPrice,
  NewInstrumentPrice,
  CurrentPositionSnapshot,
  NewCurrentPositionSnapshot,
  AccountSummarySnapshot,
  NewAccountSummarySnapshot,
};

export {
  instruments,
  orders,
  fills,
  fillTaxes,
  syncState,
  instrumentPriceSources,
  instrumentPrices,
  currentPositionSnapshots,
  accountSummarySnapshots,
};
