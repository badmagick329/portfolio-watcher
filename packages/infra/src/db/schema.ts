import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const instruments = sqliteTable('instruments', {
  isin: text('isin').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const instrumentListings = sqliteTable(
  'instrument_listings',
  {
    ticker: text('ticker').primaryKey(),
    isin: text('isin')
      .notNull()
      .references(() => instruments.isin),
    provider: text('provider').notNull().default('t212'),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('instrument_listings_isin_idx').on(table.isin),
    index('instrument_listings_provider_idx').on(table.provider),
  ],
);

const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey(),
    strategy: text('strategy').notNull(),
    type: text('type').notNull(),
    ticker: text('ticker')
      .notNull()
      .references(() => instrumentListings.ticker),
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

const instrumentCategories = sqliteTable(
  'instrument_categories',
  {
    isin: text('isin').primaryKey(),
    category: text('category').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('instrument_categories_category_idx').on(table.category)],
);

const instrumentProviderSymbols = sqliteTable(
  'instrument_provider_symbols',
  {
    isin: text('isin').notNull(),
    provider: text('provider').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('instrument_provider_symbols_unique_provider_isin_idx').on(
      table.provider,
      table.isin,
    ),
    index('instrument_provider_symbols_isin_idx').on(table.isin),
  ],
);

const instrumentRiskMetrics = sqliteTable(
  'instrument_risk_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    isin: text('isin').notNull(),
    provider: text('provider').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    beta: real('beta').notNull(),
    sourceType: text('source_type').notNull(),
    asOf: text('as_of').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('instrument_risk_metrics_isin_idx').on(table.isin),
    index('instrument_risk_metrics_fetched_at_idx').on(table.fetchedAt),
    uniqueIndex('instrument_risk_metrics_unique_snapshot_idx').on(
      table.provider,
      table.isin,
      table.asOf,
    ),
  ],
);

const instrumentRiskMetricSyncStatus = sqliteTable(
  'instrument_risk_metric_sync_status',
  {
    isin: text('isin').notNull(),
    provider: text('provider').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
    status: text('status').notNull(),
    checkedAt: text('checked_at').notNull(),
    message: text('message'),
  },
  (table) => [
    uniqueIndex('instrument_risk_metric_sync_status_unique_symbol_idx').on(
      table.provider,
      table.isin,
      table.providerSymbol,
    ),
    index('instrument_risk_metric_sync_status_checked_at_idx').on(
      table.checkedAt,
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

const orderExecutionAttempts = sqliteTable(
  'order_execution_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderType: text('order_type').notNull().default('market'),
    environment: text('environment').notNull(),
    instrumentInput: text('instrument_input').notNull(),
    resolvedTicker: text('resolved_ticker').notNull(),
    resolvedIsin: text('resolved_isin').notNull(),
    resolvedName: text('resolved_name').notNull(),
    side: text('side').notNull(),
    requestedMode: text('requested_mode').notNull(),
    requestedQuantity: real('requested_quantity'),
    requestedValue: real('requested_value'),
    derivedQuantity: real('derived_quantity').notNull(),
    referencePrice: real('reference_price'),
    extendedHours: integer('extended_hours', { mode: 'boolean' }).notNull(),
    limitPrice: real('limit_price'),
    timeValidity: text('time_validity'),
    executionMode: text('execution_mode').notNull(),
    brokerRequestPayload: text('broker_request_payload').notNull(),
    brokerResponsePayload: text('broker_response_payload'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    attemptedAt: text('attempted_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('order_execution_attempts_attempted_at_idx').on(table.attemptedAt),
    index('order_execution_attempts_resolved_ticker_idx').on(
      table.resolvedTicker,
    ),
  ],
);

const t212InstrumentCatalog = sqliteTable(
  't212_instrument_catalog',
  {
    ticker: text('ticker').primaryKey(),
    isin: text('isin').notNull(),
    name: text('name').notNull(),
    shortName: text('short_name'),
    instrumentType: text('instrument_type'),
    currencyCode: text('currency_code').notNull(),
    extendedHours: integer('extended_hours', { mode: 'boolean' }).notNull(),
    maxOpenQuantity: real('max_open_quantity'),
    addedOn: text('added_on'),
    fetchedAt: text('fetched_at').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('t212_instrument_catalog_isin_idx').on(table.isin),
    index('t212_instrument_catalog_name_idx').on(table.name),
  ],
);

type Instrument = typeof instruments.$inferSelect;
type NewInstrument = typeof instruments.$inferInsert;

type InstrumentListing = typeof instrumentListings.$inferSelect;
type NewInstrumentListing = typeof instrumentListings.$inferInsert;

type Order = typeof orders.$inferSelect;
type NewOrder = typeof orders.$inferInsert;

type Fill = typeof fills.$inferSelect;
type NewFill = typeof fills.$inferInsert;

type FillTaxes = typeof fillTaxes.$inferSelect;
type NewFillTaxes = typeof fillTaxes.$inferInsert;

type SyncState = typeof syncState.$inferSelect;
type NewSyncState = typeof syncState.$inferInsert;

type InstrumentPrice = typeof instrumentPrices.$inferSelect;
type NewInstrumentPrice = typeof instrumentPrices.$inferInsert;

type InstrumentCategory = typeof instrumentCategories.$inferSelect;
type NewInstrumentCategory = typeof instrumentCategories.$inferInsert;

type InstrumentProviderSymbol = typeof instrumentProviderSymbols.$inferSelect;
type NewInstrumentProviderSymbol =
  typeof instrumentProviderSymbols.$inferInsert;

type InstrumentRiskMetric = typeof instrumentRiskMetrics.$inferSelect;
type NewInstrumentRiskMetric = typeof instrumentRiskMetrics.$inferInsert;

type InstrumentRiskMetricSyncStatus =
  typeof instrumentRiskMetricSyncStatus.$inferSelect;
type NewInstrumentRiskMetricSyncStatus =
  typeof instrumentRiskMetricSyncStatus.$inferInsert;

type CurrentPositionSnapshot = typeof currentPositionSnapshots.$inferSelect;
type NewCurrentPositionSnapshot = typeof currentPositionSnapshots.$inferInsert;

type AccountSummarySnapshot = typeof accountSummarySnapshots.$inferSelect;
type NewAccountSummarySnapshot = typeof accountSummarySnapshots.$inferInsert;

type OrderExecutionAttempt = typeof orderExecutionAttempts.$inferSelect;
type NewOrderExecutionAttempt = typeof orderExecutionAttempts.$inferInsert;
type T212InstrumentCatalogItem = typeof t212InstrumentCatalog.$inferSelect;
type NewT212InstrumentCatalogItem = typeof t212InstrumentCatalog.$inferInsert;

export type {
  Instrument,
  NewInstrument,
  InstrumentListing,
  NewInstrumentListing,
  Order,
  NewOrder,
  Fill,
  NewFill,
  FillTaxes,
  NewFillTaxes,
  SyncState,
  NewSyncState,
  InstrumentPrice,
  NewInstrumentPrice,
  InstrumentCategory,
  NewInstrumentCategory,
  InstrumentProviderSymbol,
  NewInstrumentProviderSymbol,
  InstrumentRiskMetric,
  NewInstrumentRiskMetric,
  InstrumentRiskMetricSyncStatus,
  NewInstrumentRiskMetricSyncStatus,
  CurrentPositionSnapshot,
  NewCurrentPositionSnapshot,
  AccountSummarySnapshot,
  NewAccountSummarySnapshot,
  OrderExecutionAttempt,
  NewOrderExecutionAttempt,
  T212InstrumentCatalogItem,
  NewT212InstrumentCatalogItem,
};

export {
  instruments,
  instrumentListings,
  orders,
  fills,
  fillTaxes,
  syncState,
  instrumentPrices,
  instrumentCategories,
  instrumentProviderSymbols,
  instrumentRiskMetrics,
  instrumentRiskMetricSyncStatus,
  currentPositionSnapshots,
  accountSummarySnapshots,
  orderExecutionAttempts,
  t212InstrumentCatalog,
};
