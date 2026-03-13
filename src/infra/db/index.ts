import type { BrokerDataManager } from '@/core/broker-client';
import type {
  OrderSyncState,
  OrderSyncStateManager,
} from '@/core/order-sync-state';
import {
  mapApiOrderItemToDbObjects,
  mapDbHistoricalOrdersToApi,
} from '@/infra/db/mappers';
import {
  fillTaxes,
  fills,
  instruments,
  orders,
  syncState,
} from '@/infra/db/schema';
import type { AppError } from '@/types';
import type { HistoricalOrdersItems } from '@/types/schemas/api-responses';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { ResultAsync } from 'neverthrow';

const db = drizzle(process.env.SQLITE_DB!);
const wrapDb = <T>(fn: () => T, action: string) =>
  ResultAsync.fromPromise(
    Promise.resolve().then(fn),
    (e): AppError => ({
      code: 'DATABASE',
      message: `Failed to ${action}: ${e instanceof Error ? e.message : String(e)}`,
    }),
  );

const createOrderSyncStateManager = () => {
  const key = 'historical_orders';

  const setState = (params: OrderSyncState) =>
    wrapDb(() => {
      db.insert(syncState)
        .values({
          key,
          ...params,
        })
        .onConflictDoUpdate({
          target: syncState.key,
          set: {
            ...params,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }, 'set order sync state');

  const getState = () =>
    wrapDb(() => {
      const row = db
        .select()
        .from(syncState)
        .where(eq(syncState.key, key))
        .get();

      if (!row) {
        return undefined;
      }

      return {
        backfillNextPagePath: row.backfillNextPagePath,
        backfillCompleted: row.backfillCompleted,
        rateLimitLimit: row.rateLimitLimit ?? 0,
        rateLimitPeriodSec: row.rateLimitPeriodSec ?? 0,
        rateLimitRemaining: row.rateLimitRemaining ?? 0,
        rateLimitResetEpoch: row.rateLimitResetEpoch ?? 0,
        rateLimitUsed: row.rateLimitUsed ?? 0,
      };
    }, 'get order sync state');

  return {
    setState,
    getState,
  } satisfies OrderSyncStateManager;
};

const createBrokerDataManager = () => {
  const saveHistoricalOrders = (historicalOrdersItems: HistoricalOrdersItems) =>
    wrapDb(() => {
      historicalOrdersItems.forEach((item) => {
        const {
          instrument,
          order,
          fill,
          fillTaxes: taxes,
        } = mapApiOrderItemToDbObjects(item);

        db.insert(instruments).values(instrument).onConflictDoNothing().run();
        db.insert(orders).values(order).onConflictDoNothing().run();

        if (fill) {
          db.insert(fills).values(fill).onConflictDoNothing().run();
          if (taxes.length > 0) {
            db.insert(fillTaxes).values(taxes).onConflictDoNothing().run();
          }
        }
      });
    }, 'save historical orders');

  const getHistoricalOrders = () =>
    wrapDb(() => {
      const orderRows = db
        .select({
          orderId: orders.id,
          strategy: orders.strategy,
          type: orders.type,
          ticker: orders.ticker,
          quantity: orders.quantity,
          filledQuantity: orders.filledQuantity,
          value: orders.value,
          filledValue: orders.filledValue,
          limitPrice: orders.limitPrice,
          status: orders.status,
          currency: orders.currency,
          extendedHours: orders.extendedHours,
          initiatedFrom: orders.initiatedFrom,
          side: orders.side,
          createdAt: orders.createdAt,

          instrumentTicker: instruments.ticker,
          instrumentName: instruments.name,
          instrumentIsin: instruments.isin,
          instrumentCurrency: instruments.currency,

          fillId: fills.id,
          fillQuantity: fills.quantity,
          fillPrice: fills.price,
          fillType: fills.type,
          fillTradingMethod: fills.tradingMethod,
          fillFilledAt: fills.filledAt,
          fillWalletCurrency: fills.walletCurrency,
          fillWalletNetValue: fills.walletNetValue,
          fillWalletFxRate: fills.walletFxRate,
        })
        .from(orders)
        .innerJoin(instruments, eq(orders.ticker, instruments.ticker))
        .leftJoin(fills, eq(fills.orderId, orders.id))
        .all();

      const taxRows = db
        .select({
          fillId: fillTaxes.fillId,
          name: fillTaxes.name,
          quantity: fillTaxes.quantity,
          currency: fillTaxes.currency,
          chargedAt: fillTaxes.chargedAt,
        })
        .from(fillTaxes)
        .all();

      return mapDbHistoricalOrdersToApi(orderRows, taxRows);
    }, 'get historical orders');

  return {
    saveHistoricalOrders,
    getHistoricalOrders,
  } satisfies BrokerDataManager;
};

export { db, createOrderSyncStateManager, createBrokerDataManager };
