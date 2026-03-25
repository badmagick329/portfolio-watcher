import type {
  AppError,
  BrokerDataManager,
  HistoricalOrdersItems,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
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
  fillTaxes,
  fills,
  instrumentPrices,
  instrumentPriceSources,
  instruments,
  orders,
  syncState,
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

  const saveInstrumentPriceSource = (source: InstrumentPriceSource) =>
    wrapDb(() => {
      db.insert(instrumentPriceSources)
        .values({
          isin: source.isin,
          provider: source.provider,
          providerSymbol: source.providerSymbol,
          providerExchange: source.providerExchange,
          providerMic: source.providerMic,
          resolvedName: source.resolvedName,
          resolvedCurrency: source.resolvedCurrency,
          resolutionConfidence: source.resolutionConfidence,
          lastResolvedAt: source.lastResolvedAt,
          lastFetchStatus: source.lastFetchStatus,
          lastFetchError: source.lastFetchError,
          lastFetchAttemptedAt: source.lastFetchAttemptedAt,
          consecutiveFailures: source.consecutiveFailures,
        })
        .onConflictDoUpdate({
          target: instrumentPriceSources.isin,
          set: {
            provider: source.provider,
            providerSymbol: source.providerSymbol,
            providerExchange: source.providerExchange,
            providerMic: source.providerMic,
            resolvedName: source.resolvedName,
            resolvedCurrency: source.resolvedCurrency,
            resolutionConfidence: source.resolutionConfidence,
            lastResolvedAt: source.lastResolvedAt,
            lastFetchStatus: source.lastFetchStatus,
            lastFetchError: source.lastFetchError,
            lastFetchAttemptedAt: source.lastFetchAttemptedAt,
            consecutiveFailures: source.consecutiveFailures,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }, 'save instrument price source');

  const getInstrumentPriceSourceByIsin = (isin: string) =>
    wrapDb(() => {
      const row = db
        .select({
          isin: instrumentPriceSources.isin,
          provider: instrumentPriceSources.provider,
          providerSymbol: instrumentPriceSources.providerSymbol,
          providerExchange: instrumentPriceSources.providerExchange,
          providerMic: instrumentPriceSources.providerMic,
          resolvedName: instrumentPriceSources.resolvedName,
          resolvedCurrency: instrumentPriceSources.resolvedCurrency,
          resolutionConfidence: instrumentPriceSources.resolutionConfidence,
          lastResolvedAt: instrumentPriceSources.lastResolvedAt,
          lastFetchStatus: instrumentPriceSources.lastFetchStatus,
          lastFetchError: instrumentPriceSources.lastFetchError,
          lastFetchAttemptedAt: instrumentPriceSources.lastFetchAttemptedAt,
          consecutiveFailures: instrumentPriceSources.consecutiveFailures,
        })
        .from(instrumentPriceSources)
        .where(eq(instrumentPriceSources.isin, isin))
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentPriceSource['provider'],
            lastFetchStatus:
              (row.lastFetchStatus as InstrumentPriceSource['lastFetchStatus']) ??
              null,
          } satisfies InstrumentPriceSource)
        : undefined;
    }, 'get instrument price source by isin');

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

  const getLatestInstrumentPriceByIsin = (isin: string) =>
    wrapDb(() => {
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
        .orderBy(desc(instrumentPrices.asOf), desc(instrumentPrices.fetchedAt))
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentPriceSnapshot['provider'],
            priceType: row.priceType as InstrumentPriceSnapshot['priceType'],
          } satisfies InstrumentPriceSnapshot)
        : undefined;
    }, 'get latest instrument price by isin');

  const listInstrumentsNeedingPriceRefresh = ({
    fetchedBefore,
    failedAfter,
  }: {
    fetchedBefore: string;
    failedAfter: string;
  }) =>
    wrapDb(() => {
      const latestPriceSubquery = db
        .select({
          isin: instrumentPrices.isin,
          latestFetchedAt: sql<string>`max(${instrumentPrices.fetchedAt})`.as(
            'latest_fetched_at',
          ),
        })
        .from(instrumentPrices)
        .groupBy(instrumentPrices.isin)
        .as('latest_price_by_isin');

      const rows = db
        .select({
          ticker: instruments.ticker,
          name: instruments.name,
          isin: instruments.isin,
          currency: instruments.currency,
          latestPriceFetchedAt: latestPriceSubquery.latestFetchedAt,
          sourceIsin: instrumentPriceSources.isin,
          sourceProvider: instrumentPriceSources.provider,
          sourceProviderSymbol: instrumentPriceSources.providerSymbol,
          sourceProviderExchange: instrumentPriceSources.providerExchange,
          sourceProviderMic: instrumentPriceSources.providerMic,
          sourceResolvedName: instrumentPriceSources.resolvedName,
          sourceResolvedCurrency: instrumentPriceSources.resolvedCurrency,
          sourceResolutionConfidence: instrumentPriceSources.resolutionConfidence,
          sourceLastResolvedAt: instrumentPriceSources.lastResolvedAt,
          sourceLastFetchStatus: instrumentPriceSources.lastFetchStatus,
          sourceLastFetchError: instrumentPriceSources.lastFetchError,
          sourceLastFetchAttemptedAt: instrumentPriceSources.lastFetchAttemptedAt,
          sourceConsecutiveFailures: instrumentPriceSources.consecutiveFailures,
        })
        .from(instruments)
        .leftJoin(
          latestPriceSubquery,
          eq(instruments.isin, latestPriceSubquery.isin),
        )
        .leftJoin(
          instrumentPriceSources,
          eq(instruments.isin, instrumentPriceSources.isin),
        )
        .all();

      return rows
        .map(
          (row) =>
            ({
              ticker: row.ticker,
              name: row.name,
              isin: row.isin,
              currency: row.currency,
              latestPriceFetchedAt: row.latestPriceFetchedAt ?? null,
              priceSource: row.sourceIsin
                ? {
                    isin: row.sourceIsin,
                    provider:
                      row.sourceProvider as InstrumentPriceSource['provider'],
                    providerSymbol: row.sourceProviderSymbol!,
                    providerExchange: row.sourceProviderExchange!,
                    providerMic: row.sourceProviderMic,
                    resolvedName: row.sourceResolvedName!,
                    resolvedCurrency: row.sourceResolvedCurrency,
                    resolutionConfidence: row.sourceResolutionConfidence!,
                    lastResolvedAt: row.sourceLastResolvedAt!,
                    lastFetchStatus:
                      (row.sourceLastFetchStatus as InstrumentPriceSource['lastFetchStatus']) ??
                      null,
                    lastFetchError: row.sourceLastFetchError,
                    lastFetchAttemptedAt: row.sourceLastFetchAttemptedAt,
                    consecutiveFailures: row.sourceConsecutiveFailures ?? 0,
                  }
                : null,
            }) satisfies InstrumentPriceRefreshCandidate,
        )
        .filter((row) => {
          const stalePrice =
            !row.latestPriceFetchedAt || row.latestPriceFetchedAt < fetchedBefore;
          const failedRecently =
            row.priceSource?.lastFetchStatus === 'failed' &&
            row.priceSource.lastFetchAttemptedAt !== null &&
            row.priceSource.lastFetchAttemptedAt >= failedAfter;

          return stalePrice && !failedRecently;
        });
    }, 'list instruments needing price refresh');

  return {
    saveHistoricalOrders,
    getHistoricalOrders,
    getHistoricalOrdersForWeb,
    getDistinctInstruments,
    saveInstrumentPriceSource,
    getInstrumentPriceSourceByIsin,
    saveInstrumentPriceSnapshot,
    getLatestInstrumentPriceByIsin,
    listInstrumentsNeedingPriceRefresh,
  } satisfies BrokerDataManager;
};

export { db, createOrderSyncStateManager, createBrokerDataManager };
