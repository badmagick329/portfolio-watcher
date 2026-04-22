import type {
  AppDataState,
  AppError,
  BrokerDataManager,
  CategorizedInstrument,
  HistoricalOrdersItems,
  InstrumentCategoryFilter,
  InstrumentCategoryInstrument,
  InstrumentPriceSnapshot,
  InstrumentProviderSymbol,
  InstrumentRiskMetricSnapshot,
  InstrumentRiskMetricSyncStatus,
  InstrumentRiskProvider,
  ObservedInstrumentListing,
  OrderSyncState,
  OrderSyncStateManager,
  WebHistoricalOrderInstrument,
  WebHistoricalOrdersFilters,
} from '@portfolio/domain';
import Database from 'better-sqlite3';
import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { ResultAsync } from 'neverthrow';
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
  instrumentListings,
  instrumentPrices,
  instrumentProviderSymbols,
  instrumentRiskMetricSyncStatus,
  instrumentRiskMetrics,
  instruments,
  orderExecutionAttempts,
  orders,
  syncState,
  t212InstrumentCatalog,
} from './schema';

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

const createBrokerDataManager = (dbClient = db) => {
  const db = dbClient;

  const listObservedListingRows = () =>
    db
      .selectDistinct({
        ticker: instrumentListings.ticker,
        isin: instrumentListings.isin,
        name: instruments.name,
        currency: instruments.currency,
      })
      .from(instrumentListings)
      .innerJoin(instruments, eq(instrumentListings.isin, instruments.isin))
      .leftJoin(orders, eq(instrumentListings.ticker, orders.ticker))
      .leftJoin(
        currentPositionSnapshots,
        eq(instrumentListings.ticker, currentPositionSnapshots.providerSymbol),
      )
      .where(
        or(
          isNotNull(orders.ticker),
          isNotNull(currentPositionSnapshots.providerSymbol),
        ),
      )
      .orderBy(instrumentListings.ticker)
      .all();

  const listPreferredInstrumentRows = () => {
    const listingRows = listObservedListingRows();

    const snapshotRows = db
      .select({
        isin: currentPositionSnapshots.isin,
        providerSymbol: currentPositionSnapshots.providerSymbol,
      })
      .from(currentPositionSnapshots)
      .orderBy(
        desc(currentPositionSnapshots.asOf),
        desc(currentPositionSnapshots.fetchedAt),
      )
      .all();

    const listingsByIsin = new Map<string, (typeof listingRows)[number][]>();
    listingRows.forEach((row) => {
      const existing = listingsByIsin.get(row.isin) ?? [];
      existing.push(row);
      listingsByIsin.set(row.isin, existing);
    });

    const latestProviderSymbolByIsin = new Map<string, string>();
    snapshotRows.forEach((row) => {
      if (!latestProviderSymbolByIsin.has(row.isin)) {
        latestProviderSymbolByIsin.set(row.isin, row.providerSymbol);
      }
    });

    return [...listingsByIsin.entries()]
      .map(([isin, listings]): WebHistoricalOrderInstrument => {
        const preferredTicker = latestProviderSymbolByIsin.get(isin);
        const preferredListing =
          listings.find((row) => row.ticker === preferredTicker) ?? listings[0]!;

        return {
          ticker: preferredListing.ticker,
          name: preferredListing.name,
          isin: preferredListing.isin,
          currency: preferredListing.currency,
        };
      })
      .sort((left, right) => left.ticker.localeCompare(right.ticker));
  };

  const saveHistoricalOrders = (historicalOrdersItems: HistoricalOrdersItems) =>
    wrapDb(() => {
      let savedOrdersCount = 0;

      db.transaction((tx) => {
        historicalOrdersItems.forEach((item) => {
          const {
            instrument,
            listing,
            order,
            fill,
            fillTaxes: taxes,
          } = mapApiOrderItemToDbObjects(item);

          tx.insert(instruments).values(instrument).onConflictDoNothing().run();
          tx.insert(instrumentListings)
            .values(listing)
            .onConflictDoUpdate({
              target: instrumentListings.ticker,
              set: {
                isin: listing.isin,
                provider: listing.provider,
                name: listing.name,
                currency: listing.currency,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            })
            .run();
          const insertedOrdersId = tx
            .insert(orders)
            .values(order)
            .onConflictDoNothing()
            .returning({ id: orders.id })
            .all();

          if (insertedOrdersId.length > 0) {
            savedOrdersCount++;
          }

          if (fill && typeof fill.id === 'number') {
            tx.insert(fills).values(fill).onConflictDoNothing().run();
            const storedFill = tx
              .select({ id: fills.id })
              .from(fills)
              .where(eq(fills.id, fill.id))
              .get();

            if (storedFill && taxes.length > 0) {
              tx.insert(fillTaxes).values(taxes).onConflictDoNothing().run();
            }
          }
        });
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

          instrumentTicker: instrumentListings.ticker,
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
        .innerJoin(
          instrumentListings,
          eq(orders.ticker, instrumentListings.ticker),
        )
        .innerJoin(instruments, eq(instrumentListings.isin, instruments.isin))
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

          instrumentTicker: instrumentListings.ticker,
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
        .innerJoin(
          instrumentListings,
          eq(orders.ticker, instrumentListings.ticker),
        )
        .innerJoin(instruments, eq(instrumentListings.isin, instruments.isin))
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
    wrapDb(() => listPreferredInstrumentRows(), 'get distinct instruments');

  const getAppDataState = () =>
    wrapDb(() => {
      const latestOrdersSyncRow = db
        .select({ updatedAt: syncState.updatedAt })
        .from(syncState)
        .where(eq(syncState.key, 'historical_orders'))
        .get();
      const latestPortfolioSyncRow = db
        .select({ fetchedAt: accountSummarySnapshots.fetchedAt })
        .from(accountSummarySnapshots)
        .orderBy(desc(accountSummarySnapshots.fetchedAt))
        .get();
      const latestRiskMetricsSyncRow = db
        .select({ fetchedAt: instrumentRiskMetrics.fetchedAt })
        .from(instrumentRiskMetrics)
        .orderBy(desc(instrumentRiskMetrics.fetchedAt))
        .get();
      const hasHistoricalOrders = Boolean(
        db.select({ id: orders.id }).from(orders).limit(1).get(),
      );
      const hasCurrentHoldings = Boolean(
        db
          .select({ id: currentPositionSnapshots.id })
          .from(currentPositionSnapshots)
          .where(sql`${currentPositionSnapshots.quantity} > 0`)
          .limit(1)
          .get(),
      );
      const hasCategories = Boolean(
        db
          .select({ isin: instrumentCategories.isin })
          .from(instrumentCategories)
          .limit(1)
          .get(),
      );
      const hasStoredRiskMetrics = Boolean(
        db
          .select({ id: instrumentRiskMetrics.id })
          .from(instrumentRiskMetrics)
          .limit(1)
          .get(),
      );
      const hasSuccessfulSubmittedOrderAttempt = Boolean(
        db
          .select({ id: orderExecutionAttempts.id })
          .from(orderExecutionAttempts)
          .where(
            and(
              eq(orderExecutionAttempts.executionMode, 'submitted'),
              sql`${orderExecutionAttempts.errorCode} IS NULL`,
            ),
          )
          .limit(1)
          .get(),
      );

      return {
        hasHistoricalOrders,
        hasCurrentHoldings,
        hasCategories,
        hasStoredRiskMetrics,
        hasSuccessfulSubmittedOrderAttempt,
        lastOrdersSyncAt: latestOrdersSyncRow?.updatedAt ?? null,
        lastPortfolioSyncAt: latestPortfolioSyncRow?.fetchedAt ?? null,
        lastRiskMetricsSyncAt: latestRiskMetricsSyncRow?.fetchedAt ?? null,
      } satisfies AppDataState;
    }, 'get app data state');

  const findInstrumentCategoryInstrumentMatches = (input: string) =>
    wrapDb(() => {
      const normalizedInput = normalize(input);

      if (normalizedInput.length === 0) {
        return [];
      }

      const rows = listObservedListingRows();
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

  const setInstrumentCategories = (isins: string[], category: string) =>
    wrapDb(() => {
      db.transaction((tx) => {
        isins.forEach((isin) => {
          tx.insert(instrumentCategories)
            .values({ isin, category })
            .onConflictDoUpdate({
              target: instrumentCategories.isin,
              set: {
                category,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            })
            .run();
        });
      });
    }, 'set instrument categories');

  const unsetInstrumentCategories = (isins: string[]) =>
    wrapDb(() => {
      db.delete(instrumentCategories)
        .where(inArray(instrumentCategories.isin, isins))
        .run();
    }, 'unset instrument categories');

  const listCategorizedInstruments = (filters: InstrumentCategoryFilter = {}) =>
    wrapDb(() => {
      const categoryRows = db
        .select({
          isin: instrumentCategories.isin,
          category: instrumentCategories.category,
        })
        .from(instrumentCategories)
        .all();

      const categoriesByIsin = new Map(
        categoryRows.map((row) => [row.isin, row.category]),
      );
      const rows = listPreferredInstrumentRows().map((row) => ({
        ...row,
        category: categoriesByIsin.get(row.isin) ?? null,
      }));

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

  const saveObservedInstrumentListing = (listing: ObservedInstrumentListing) =>
    wrapDb(() => {
      db.transaction((tx) => {
        tx.insert(instruments)
          .values({
            isin: listing.isin,
            name: listing.name,
            currency: listing.currency,
          })
          .onConflictDoUpdate({
            target: instruments.isin,
            set: {
              name: listing.name,
              currency: listing.currency,
            },
          })
          .run();

        tx.insert(instrumentListings)
          .values({
            ticker: listing.ticker,
            isin: listing.isin,
            provider: 't212',
            name: listing.name,
            currency: listing.currency,
          })
          .onConflictDoUpdate({
            target: instrumentListings.ticker,
            set: {
              isin: listing.isin,
              provider: 't212',
              name: listing.name,
              currency: listing.currency,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          })
          .run();
      });
    }, 'save observed instrument listing');

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
        const publicTicker = (row.ticker.split('_')[0] ?? '')
          .trim()
          .toLowerCase();
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

  const setInstrumentProviderSymbol = ({
    isin,
    provider,
    providerSymbol,
  }: Pick<InstrumentProviderSymbol, 'isin' | 'provider' | 'providerSymbol'>) =>
    wrapDb(() => {
      db.insert(instrumentProviderSymbols)
        .values({ isin, provider, providerSymbol })
        .onConflictDoUpdate({
          target: [
            instrumentProviderSymbols.provider,
            instrumentProviderSymbols.isin,
          ],
          set: {
            providerSymbol,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }, 'set instrument provider symbol');

  const unsetInstrumentProviderSymbol = (
    isin: string,
    provider: InstrumentRiskProvider,
  ) =>
    wrapDb(() => {
      db.delete(instrumentProviderSymbols)
        .where(
          and(
            eq(instrumentProviderSymbols.isin, isin),
            eq(instrumentProviderSymbols.provider, provider),
          ),
        )
        .run();
    }, 'unset instrument provider symbol');

  const listInstrumentProviderSymbols = (provider?: InstrumentRiskProvider) =>
    wrapDb(() => {
      const query = db
        .select({
          isin: instrumentProviderSymbols.isin,
          provider: instrumentProviderSymbols.provider,
          providerSymbol: instrumentProviderSymbols.providerSymbol,
          updatedAt: instrumentProviderSymbols.updatedAt,
        })
        .from(instrumentProviderSymbols)
        .orderBy(
          instrumentProviderSymbols.provider,
          instrumentProviderSymbols.isin,
        );

      const rows = provider
        ? query.where(eq(instrumentProviderSymbols.provider, provider)).all()
        : query.all();

      return rows.map(
        (row): InstrumentProviderSymbol => ({
          ...row,
          provider: row.provider as InstrumentRiskProvider,
        }),
      );
    }, 'list instrument provider symbols');

  const getInstrumentProviderSymbol = (
    isin: string,
    provider: InstrumentRiskProvider,
  ) =>
    wrapDb(() => {
      const row = db
        .select({
          isin: instrumentProviderSymbols.isin,
          provider: instrumentProviderSymbols.provider,
          providerSymbol: instrumentProviderSymbols.providerSymbol,
          updatedAt: instrumentProviderSymbols.updatedAt,
        })
        .from(instrumentProviderSymbols)
        .where(
          and(
            eq(instrumentProviderSymbols.isin, isin),
            eq(instrumentProviderSymbols.provider, provider),
          ),
        )
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentRiskProvider,
          } satisfies InstrumentProviderSymbol)
        : undefined;
    }, 'get instrument provider symbol');

  const saveInstrumentRiskMetricSnapshot = (
    snapshot: InstrumentRiskMetricSnapshot,
  ) =>
    wrapDb(() => {
      db.insert(instrumentRiskMetrics)
        .values({
          isin: snapshot.isin,
          provider: snapshot.provider,
          providerSymbol: snapshot.providerSymbol,
          beta: snapshot.beta,
          sourceType: snapshot.sourceType,
          asOf: snapshot.asOf,
          fetchedAt: snapshot.fetchedAt,
        })
        .onConflictDoNothing()
        .run();
    }, 'save instrument risk metric snapshot');

  const getLatestInstrumentRiskMetricByIsin = (
    isin: string,
    provider: InstrumentRiskProvider,
  ) =>
    wrapDb(() => {
      const row = db
        .select({
          isin: instrumentRiskMetrics.isin,
          provider: instrumentRiskMetrics.provider,
          providerSymbol: instrumentRiskMetrics.providerSymbol,
          beta: instrumentRiskMetrics.beta,
          sourceType: instrumentRiskMetrics.sourceType,
          asOf: instrumentRiskMetrics.asOf,
          fetchedAt: instrumentRiskMetrics.fetchedAt,
        })
        .from(instrumentRiskMetrics)
        .where(
          and(
            eq(instrumentRiskMetrics.isin, isin),
            eq(instrumentRiskMetrics.provider, provider),
          ),
        )
        .orderBy(
          desc(instrumentRiskMetrics.asOf),
          desc(instrumentRiskMetrics.fetchedAt),
        )
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentRiskProvider,
            sourceType:
              row.sourceType as InstrumentRiskMetricSnapshot['sourceType'],
          } satisfies InstrumentRiskMetricSnapshot)
        : undefined;
    }, 'get latest instrument risk metric by isin');

  const saveInstrumentRiskMetricSyncStatus = (
    status: InstrumentRiskMetricSyncStatus,
  ) =>
    wrapDb(() => {
      db.insert(instrumentRiskMetricSyncStatus)
        .values({
          isin: status.isin,
          provider: status.provider,
          providerSymbol: status.providerSymbol,
          status: status.status,
          checkedAt: status.checkedAt,
          message: status.message,
        })
        .onConflictDoUpdate({
          target: [
            instrumentRiskMetricSyncStatus.provider,
            instrumentRiskMetricSyncStatus.isin,
            instrumentRiskMetricSyncStatus.providerSymbol,
          ],
          set: {
            status: status.status,
            checkedAt: status.checkedAt,
            message: status.message,
          },
        })
        .run();
    }, 'save instrument risk metric sync status');

  const getInstrumentRiskMetricSyncStatus = ({
    isin,
    provider,
    providerSymbol,
  }: Pick<
    InstrumentRiskMetricSyncStatus,
    'isin' | 'provider' | 'providerSymbol'
  >) =>
    wrapDb(() => {
      const row = db
        .select({
          isin: instrumentRiskMetricSyncStatus.isin,
          provider: instrumentRiskMetricSyncStatus.provider,
          providerSymbol: instrumentRiskMetricSyncStatus.providerSymbol,
          status: instrumentRiskMetricSyncStatus.status,
          checkedAt: instrumentRiskMetricSyncStatus.checkedAt,
          message: instrumentRiskMetricSyncStatus.message,
        })
        .from(instrumentRiskMetricSyncStatus)
        .where(
          and(
            eq(instrumentRiskMetricSyncStatus.isin, isin),
            eq(instrumentRiskMetricSyncStatus.provider, provider),
            eq(instrumentRiskMetricSyncStatus.providerSymbol, providerSymbol),
          ),
        )
        .get();

      return row
        ? ({
            ...row,
            provider: row.provider as InstrumentRiskProvider,
            status: row.status as InstrumentRiskMetricSyncStatus['status'],
            message: row.message ?? null,
          } satisfies InstrumentRiskMetricSyncStatus)
        : undefined;
    }, 'get instrument risk metric sync status');

  return {
    saveHistoricalOrders,
    getHistoricalOrders,
    getHistoricalOrdersForWeb,
    getDistinctInstruments,
    getAppDataState,
    findInstrumentCategoryInstrumentMatches,
    setInstrumentCategory,
    unsetInstrumentCategory,
    setInstrumentCategories,
    unsetInstrumentCategories,
    listCategorizedInstruments,
    saveInstrumentPriceSnapshot,
    saveCurrentPositionSnapshot,
    saveObservedInstrumentListing,
    getLatestCurrentPositionSnapshotByIsin,
    saveAccountSummarySnapshot,
    saveOrderExecutionAttempt,
    saveT212InstrumentCatalogItems,
    findT212InstrumentCatalogMatches,
    getLatestAccountSummarySnapshot,
    getLatestInstrumentPriceByIsin,
    setInstrumentProviderSymbol,
    unsetInstrumentProviderSymbol,
    listInstrumentProviderSymbols,
    getInstrumentProviderSymbol,
    saveInstrumentRiskMetricSnapshot,
    getLatestInstrumentRiskMetricByIsin,
    saveInstrumentRiskMetricSyncStatus,
    getInstrumentRiskMetricSyncStatus,
  } satisfies BrokerDataManager;
};

const normalize = (value: string) => value.trim().toLowerCase();

export { db, createOrderSyncStateManager, createBrokerDataManager };
