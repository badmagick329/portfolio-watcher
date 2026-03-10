import type {
  OrderSyncState,
  OrderSyncStateManager,
} from '@/core/order-sync-state';
import { syncState } from '@/infra/db/schema';
import type { AppError } from '@/types';
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
      };
    }, 'get order sync state');

  return {
    setState,
    getState,
  } satisfies OrderSyncStateManager;
};

export { db, createOrderSyncStateManager };
