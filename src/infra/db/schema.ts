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
    quantity: real('quantity').notNull(),
    filledQuantity: real('filled_quantity').notNull(),
    limitPrice: real('limit_price').notNull(),
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
  (table) => [index('fill_taxes_fill_id_idx').on(table.fillId)],
);

type Order = typeof orders.$inferSelect;
type NewOrder = typeof orders.$inferInsert;

type Fill = typeof fills.$inferSelect;
type NewFill = typeof fills.$inferInsert;

export type { Order, NewOrder, Fill, NewFill };

export { instruments, orders, fills, fillTaxes };
