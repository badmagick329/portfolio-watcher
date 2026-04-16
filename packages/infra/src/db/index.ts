import type {
  AppError,
  BrokerDataManager,
  CategorizedInstrument,
  HistoricalOrdersItems,
  InstrumentCategoryFilter,
  InstrumentCategoryInstrument,
  InstrumentPriceSnapshot,
  OrderSyncState,
  OrderSyncStateManager,
  WebHistoricalOrdersFilters,
} from '@portfolio/domain';
import {
  mapApiOrderItemToDbObjects,
  mapDbHistoricalOrdersToApi,
  mapDbHistoricalOrdersToWeb,
} from './mappers';
import {
  accountSummarySnapshots,
  currentPositionSnapshots,
  fillTaxes,
  fills,
  instrumentCategories,
  instrumentPrices,
  instruments,
  orderExecutionAttempts,
  orders,
  syncState,
  t212InstrumentCatalog,
} from './schema';
import Database from 'better-sqlite3';
import { desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { ResultAsync } from 'neverthrow';

const sqlite = new Database(process.env.SQLITE_DB!);
const db = drizzle(sqlite);
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
          nextPagePath: params.nextPagePath,
          backfillCompleted: params.backfillCompleted,
          rateLimitLimit: params.rateLimitLimit,
          rateLimitPeriodSec: params.rateLimitPeriodSec,
          rateLimitRemaining: params.rateLimitRemaining,
          rateLimitResetEpoch: params.rateLimitResetEpoch,
          rateLimitUsed: params.rateLimitUsed,
        })
        .onConflictDoUpdate({
          target: syncState.key,
          set: {
            nextPagePath: params.nextPagePath,
            backfillCompleted: params.backfillCompleted,
            rateLimitLimit: params.rateLimitLimit,
            rateLimitPeriodSec: params.rateLimitPeriodSec,
            rateLimitRemaining: params.rateLimitRemaining,
            rateLimitResetEpoch: params.rateLimitResetEpoch,
            rateLimitUsed: params.rateLimitUsed,
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
        nextPagePath: row.nextPagePath,
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
      let savedOrdersCount = 0;

      historicalOrdersItems.forEach((item) => {
        const {
          instrument,
          order,
          fill,
          fillTaxes: taxes,
        } = mapApiOrderItemToDbObjects(item);

        db.insert(instruments).values(instrument).onConflictDoNothing().run();
        const insertedOrdersId = db
          .insert(orders)
          .values(order)
          .onConflictDoNothing()
          .returning({ id: orders.id })
          .all();

        if (insertedOrdersId.length > 0) {
          savedOrdersCount++;
        }

        if (fill) {
          db.insert(fills).values(fill).onConflictDoNothing().run();
          if (taxes.length > 0) {
            db.insert(fillTaxes).values(taxes).onConflictDoNothing().run();
          }
        }
      });

      return savedOrdersCount;
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

  const getHistoricalOrdersForWeb = (
    filters: WebHistoricalOrdersFilters = {},
  ) =>
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

      return mapDbHistoricalOrdersToWeb(orderRows, taxRows, filters);
    }, 'get historical orders for web');

  const getDistinctInstruments = () =>
    wrapDb(
      () =>
        db
          .selectDistinct({
            ticker: instruments.ticker,
            name: instruments.name,
            isin: instruments.isin,
            currency: instruments.currency,
          })
          .from(instruments)
          .all(),
      'get distinct instruments',
    );

  const findInstrumentCategoryInstrumentMatches = (input: string) =>
    wrapDb(() => {
      const normalizedInput = normalize(input);

      if (normalizedInput.length === 0) {
        return [];
      }

      const portfolioRows = db
        .selectDistinct({
          ticker: instruments.ticker,
          name: instruments.name,
          isin: instruments.isin,
          currency: instruments.currency,
        })
        .from(instruments)
        .all();

      const catalogRows = db
        .select({
          ticker: t212InstrumentCatalog.ticker,
          name: t212InstrumentCatalog.name,
          isin: t212InstrumentCatalog.isin,
          currency: t212InstrumentCatalog.currencyCode,
        })
        .from(t212InstrumentCatalog)
        .all();

      const rows = [...portfolioRows, ...catalogRows];
      const seen = new Set<string>();

      return rows.filter((row) => {
        const ticker = normalize(row.ticker);
        const publicTicker = normalize(row.ticker.split('_')[0] ?? '');
        const isin = normalize(row.isin);
        const name = normalize(row.name);

        const matched =
          ticker === normalizedInput ||
          publicTicker === normalizedInput ||
          isin === normalizedInput ||
          name === normalizedInput ||
          ticker.startsWith(normalizedInput) ||
          publicTicker.startsWith(normalizedInput) ||
          name.startsWith(normalizedInput) ||
          ticker.includes(normalizedInput) ||
          name.includes(normalizedInput);

        if (!matched || seen.has(row.isin)) {
          return false;
        }

        seen.add(row.isin);
        return true;
      });
    }, 'find instrument category instrument matches');

  const setInstrumentCategory = (isin: string, category: string) =>
    wrapDb(() => {
      db.insert(instrumentCategories)
        .values({ isin, category })
        .onConflictDoUpdate({
          target: instrumentCategories.isin,
          set: {
            category,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }, 'set instrument category');

  const unsetInstrumentCategory = (isin: string) =>
    wrapDb(() => {
      db.delete(instrumentCategories)
        .where(eq(instrumentCategories.isin, isin))
        .run();
    }, 'unset instrument category');

  const listCategorizedInstruments = (
    filters: InstrumentCategoryFilter = {},
  ) =>
    wrapDb(() => {
      const rows = db
        .selectDistinct({
          ticker: instruments.ticker,
          name: instruments.name,
          isin: instruments.isin,
          currency: instruments.currency,
          category: instrumentCategories.category,
        })
        .from(instruments)
        .leftJoin(
          instrumentCategories,
          eq(instruments.isin, instrumentCategories.isin),
        )
        .all();

      const include = new Set(filters.includeCategories ?? []);
      const exclude = new Set(filters.excludeCategories ?? []);

      return rows
        .filter((row) => {
          const category = row.category ?? null;

          if (include.size > 0 && (!category || !include.has(category))) {
            return false;
          }

          if (category && exclude.has(category)) {
            return false;
          }

          return true;
        })
        .sort((left, right) => left.ticker.localeCompare(right.ticker))
        .map(
          (row): CategorizedInstrument => ({
            ticker: row.ticker,
            name: row.name,
            isin: row.isin,
            currency: row.currency,
            category: row.category ?? null,
          }),
        );
    }, 'list categorized instruments');

  const saveInstrumentPriceSnapshot = (snapshot: InstrumentPriceSnapshot) =>
    wrapDb(() => {
      db.insert(instrumentPrices)
        .values({
          isin: snapshot.isin,
          provider: snapshot.provider,
          providerSymbol: snapshot.providerSymbol,
          currency: snapshot.currency,
          price: snapshot.price,
          priceType: snapshot.priceType,
          asOf: snapshot.asOf,
          fetchedAt: snapshot.fetchedAt,
        })
        .onConflictDoNothing()
        .run();
    }, 'save instrument price snapshot');

  const saveCurrentPositionSnapshot = (
    snapshot: import('@portfolio/domain').CurrentPositionSnapshot,
  ) =>
    wrapDb(() => {
      db.insert(currentPositionSnapshots)
        .values({
          isin: snapshot.isin,
          providerSymbol: snapshot.providerSymbol,
          quantity: snapshot.quantity,
          currentPrice: snapshot.currentPrice,
          instrumentCurrency: snapshot.instrumentCurrency,
          walletCurrency: snapshot.walletCurrency,
          currentValue: snapshot.currentValue,
          totalCost: snapshot.totalCost,
          unrealizedProfitLoss: snapshot.unrealizedProfitLoss,
          fxImpact: snapshot.fxImpact,
          asOf: snapshot.asOf,
          fetchedAt: snapshot.fetchedAt,
        })
        .onConflictDoNothing()
        .run();
    }, 'save current position snapshot');

  const getLatestCurrentPositionSnapshotByIsin = (isin: string) =>
    wrapDb(() => {
      const row = db
        .select({
          isin: currentPositionSnapshots.isin,
          providerSymbol: currentPositionSnapshots.providerSymbol,
          quantity: currentPositionSnapshots.quantity,
          currentPrice: currentPositionSnapshots.currentPrice,
          instrumentCurrency: currentPositionSnapshots.instrumentCurrency,
          walletCurrency: currentPositionSnapshots.walletCurrency,
          currentValue: currentPositionSnapshots.currentValue,
          totalCost: currentPositionSnapshots.totalCost,
          unrealizedProfitLoss: currentPositionSnapshots.unrealizedProfitLoss,
          fxImpact: currentPositionSnapshots.fxImpact,
          asOf: currentPositionSnapshots.asOf,
          fetchedAt: currentPositionSnapshots.fetchedAt,
        })
        .from(currentPositionSnapshots)
        .where(eq(currentPositionSnapshots.isin, isin))
        .orderBy(
          desc(currentPositionSnapshots.asOf),
          desc(currentPositionSnapshots.fetchedAt),
        )
        .get();

      return row
        ? ({
            ...row,
            fxImpact: row.fxImpact ?? null,
          } satisfies import('@portfolio/domain').CurrentPositionSnapshot)
        : undefined;
    }, 'get latest current position snapshot by isin');

  const saveAccountSummarySnapshot = (
    snapshot: import('@portfolio/domain').AccountSummarySnapshot,
  ) =>
    wrapDb(() => {
      db.insert(accountSummarySnapshots)
        .values({
          currency: snapshot.currency,
          currentValue: snapshot.currentValue,
          totalCost: snapshot.totalCost,
          realizedProfitLoss: snapshot.realizedProfitLoss,
          unrealizedProfitLoss: snapshot.unrealizedProfitLoss,
          totalValue: snapshot.totalValue,
          asOf: snapshot.asOf,
          fetchedAt: snapshot.fetchedAt,
        })
        .onConflictDoNothing()
        .run();
    }, 'save account summary snapshot');

  const saveOrderExecutionAttempt = (
    attempt: import('@portfolio/domain').OrderExecutionAttempt,
  ) =>
    wrapDb(() => {
        db.insert(orderExecutionAttempts)
        .values({
          orderType: attempt.orderType,
          environment: attempt.environment,
          instrumentInput: attempt.instrumentInput,
          resolvedTicker: attempt.resolvedTicker,
          resolvedIsin: attempt.resolvedIsin,
          resolvedName: attempt.resolvedName,
          side: attempt.side,
          requestedMode: attempt.requestedMode,
          requestedQuantity: attempt.requestedQuantity,
          requestedValue: attempt.requestedValue,
          derivedQuantity: attempt.derivedQuantity,
          referencePrice: attempt.referencePrice,
          extendedHours: attempt.extendedHours,
          limitPrice: attempt.limitPrice,
          timeValidity: attempt.timeValidity,
          executionMode: attempt.executionMode,
          brokerRequestPayload: attempt.brokerRequestPayload,
          brokerResponsePayload: attempt.brokerResponsePayload,
          errorCode: attempt.errorCode,
          errorMessage: attempt.errorMessage,
          attemptedAt: attempt.attemptedAt,
        })
        .run();
    }, 'save order execution attempt');

  const saveT212InstrumentCatalogItems = (
    items: import('@portfolio/domain').T212InstrumentCatalogItem[],
  ) =>
    wrapDb(() => {
      items.forEach((item) => {
        db.insert(t212InstrumentCatalog)
          .values({
            ticker: item.ticker,
            isin: item.isin,
            name: item.name,
            shortName: item.shortName,
            instrumentType: item.instrumentType,
            currencyCode: item.currencyCode,
            extendedHours: item.extendedHours,
            maxOpenQuantity: item.maxOpenQuantity,
            addedOn: item.addedOn,
            fetchedAt: item.fetchedAt,
          })
          .onConflictDoUpdate({
            target: t212InstrumentCatalog.ticker,
            set: {
              isin: item.isin,
              name: item.name,
              shortName: item.shortName,
              instrumentType: item.instrumentType,
              currencyCode: item.currencyCode,
              extendedHours: item.extendedHours,
              maxOpenQuantity: item.maxOpenQuantity,
              addedOn: item.addedOn,
              fetchedAt: item.fetchedAt,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          })
          .run();
      });

      return items.length;
    }, 'save t212 instrument catalog items');

  const findT212InstrumentCatalogMatches = (input: string) =>
    wrapDb(() => {
      const normalizedInput = input.trim().toLowerCase();

      if (normalizedInput.length === 0) {
        return [];
      }

      const rows = db
        .select({
          ticker: t212InstrumentCatalog.ticker,
          isin: t212InstrumentCatalog.isin,
          name: t212InstrumentCatalog.name,
          shortName: t212InstrumentCatalog.shortName,
          instrumentType: t212InstrumentCatalog.instrumentType,
          currencyCode: t212InstrumentCatalog.currencyCode,
          extendedHours: t212InstrumentCatalog.extendedHours,
          maxOpenQuantity: t212InstrumentCatalog.maxOpenQuantity,
          addedOn: t212InstrumentCatalog.addedOn,
          fetchedAt: t212InstrumentCatalog.fetchedAt,
        })
        .from(t212InstrumentCatalog)
        .all();

      return rows.filter((row) => {
        const ticker = row.ticker.trim().toLowerCase();
        const publicTicker = (row.ticker.split('_')[0] ?? '').trim().toLowerCase();
        const isin = row.isin.trim().toLowerCase();
        const name = row.name.trim().toLowerCase();
        const shortName = row.shortName?.trim().toLowerCase() ?? '';

        return (
          ticker === normalizedInput ||
          publicTicker === normalizedInput ||
          isin === normalizedInput ||
          name === normalizedInput ||
          shortName === normalizedInput ||
          ticker.startsWith(normalizedInput) ||
          publicTicker.startsWith(normalizedInput) ||
          name.startsWith(normalizedInput) ||
          shortName.startsWith(normalizedInput) ||
          ticker.includes(normalizedInput) ||
          name.includes(normalizedInput) ||
          shortName.includes(normalizedInput)
        );
      });
    }, 'find t212 instrument catalog matches');

  const getLatestAccountSummarySnapshot = () =>
    wrapDb(() => {
      const row = db
        .select({
          currency: accountSummarySnapshots.currency,
          currentValue: accountSummarySnapshots.currentValue,
          totalCost: accountSummarySnapshots.totalCost,
          realizedProfitLoss: accountSummarySnapshots.realizedProfitLoss,
          unrealizedProfitLoss: accountSummarySnapshots.unrealizedProfitLoss,
          totalValue: accountSummarySnapshots.totalValue,
          asOf: accountSummarySnapshots.asOf,
          fetchedAt: accountSummarySnapshots.fetchedAt,
        })
        .from(accountSummarySnapshots)
        .orderBy(
          desc(accountSummarySnapshots.asOf),
          desc(accountSummarySnapshots.fetchedAt),
        )
        .get();

      return row
        ? ({
            ...row,
          } satisfies import('@portfolio/domain').AccountSummarySnapshot)
        : undefined;
    }, 'get latest account summary snapshot');

  const getLatestInstrumentPriceByIsin = (isin: string) =>
    wrapDb(() => {
      const providerPriority = sql<number>`
        case
          when ${instrumentPrices.provider} = 'manual' then 2
          when ${instrumentPrices.provider} = 't212' then 1
          else 0
        end
      `;
      const row = db
        .select({
          isin: instrumentPrices.isin,
          provider: instrumentPrices.provider,
          providerSymbol: instrumentPrices.providerSymbol,
          currency: instrumentPrices.currency,
          price: instrumentPrices.price,
          priceType: instrumentPrices.priceType,
          asOf: instrumentPrices.asOf,
          fetchedAt: instrumentPrices.fetchedAt,
        })
        .from(instrumentPrices)
        .where(eq(instrumentPrices.isin, isin))
        .orderBy(
          desc(instrumentPrices.asOf),
          desc(instrumentPrices.fetchedAt),
          desc(providerPriority),
        )
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentPriceSnapshot['provider'],
            priceType: row.priceType as InstrumentPriceSnapshot['priceType'],
          } satisfies InstrumentPriceSnapshot)
        : undefined;
    }, 'get latest instrument price by isin');

  return {
    saveHistoricalOrders,
    getHistoricalOrders,
    getHistoricalOrdersForWeb,
    getDistinctInstruments,
    findInstrumentCategoryInstrumentMatches,
    setInstrumentCategory,
    unsetInstrumentCategory,
    listCategorizedInstruments,
    saveInstrumentPriceSnapshot,
    saveCurrentPositionSnapshot,
    getLatestCurrentPositionSnapshotByIsin,
    saveAccountSummarySnapshot,
    saveOrderExecutionAttempt,
    saveT212InstrumentCatalogItems,
    findT212InstrumentCatalogMatches,
    getLatestAccountSummarySnapshot,
    getLatestInstrumentPriceByIsin,
  } satisfies BrokerDataManager;
};

const normalize = (value: string) => value.trim().toLowerCase();

export { db, createOrderSyncStateManager, createBrokerDataManager };
