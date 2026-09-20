import type {
  AppError,
  BrokerDataManager,
  CurrentPortfolioSnapshot,
  PortfolioExport,
  PortfolioExportHoldingHistory,
  PortfolioExportTransaction,
  PortfolioHistoryInstrument,
  PortfolioStateSyncResult,
  SyncStepResult,
  WebHistoricalOrder,
} from '@portfolio/domain';
import { type ResultAsync, errAsync, okAsync } from 'neverthrow';

type Params = {
  syncInstrumentCatalog: () => ResultAsync<number, AppError>;
  syncHistoricalOrders: () => ResultAsync<SyncStepResult, AppError>;
  syncPortfolioState: () => ResultAsync<PortfolioStateSyncResult, AppError>;
  dataManager: Pick<
    BrokerDataManager,
    | 'getHistoricalOrdersForWeb'
    | 'getLatestCurrentPortfolioSnapshot'
    | 'getPortfolioHistoryInstruments'
  >;
};

const createExportCurrentPortfolio =
  ({
    syncInstrumentCatalog,
    syncHistoricalOrders,
    syncPortfolioState,
    dataManager,
  }: Params) =>
  (): ResultAsync<PortfolioExport, AppError> =>
    syncInstrumentCatalog()
      .andThen(() => syncHistoricalOrders())
      .andThen((syncResult) => {
        if (syncResult === 'in_sync') {
          return okAsync(undefined);
        }

        return errAsync<void, AppError>({
          code: 'VALIDATION',
          message: `Historical order sync did not complete (${syncResult}); portfolio export was not created because its history may be incomplete.`,
        });
      })
      .andThen(() => syncPortfolioState())
      .andThen(() => dataManager.getLatestCurrentPortfolioSnapshot())
      .andThen((snapshot) => {
        if (!snapshot) {
          return errAsync<PortfolioExport, AppError>({
            code: 'VALIDATION',
            message:
              'No current portfolio snapshot is available after refresh.',
          });
        }

        return dataManager
          .getHistoricalOrdersForWeb()
          .andThen(({ items }) =>
            dataManager
              .getPortfolioHistoryInstruments()
              .map((instruments) =>
                buildPortfolioExport(snapshot, items, instruments),
              ),
          );
      });

const buildPortfolioExport = (
  snapshot: CurrentPortfolioSnapshot,
  historicalOrders: WebHistoricalOrder[],
  historyInstruments: PortfolioHistoryInstrument[],
): PortfolioExport => {
  const { accountSummary } = snapshot;
  const holdings = snapshot.holdings.map(
    ({ ticker, name, isin, instrumentType, category, position }) => ({
      name,
      instrumentType,
      isin,
      trading212Ticker: ticker,
      category,
      quantity: position.quantity,
      averageUnitCost: position.averagePricePaid ?? null,
      currentUnitPrice: position.currentPrice,
      priceCurrency: position.instrumentCurrency,
      totalCost: position.totalCost,
      currentValue: position.currentValue,
      unrealizedProfitLoss: position.unrealizedProfitLoss,
      valueCurrency: position.walletCurrency,
      portfolioWeightPercent:
        accountSummary.currentValue === 0
          ? 0
          : (position.currentValue / accountSummary.currentValue) * 100,
    }),
  );

  return {
    asOf: accountSummary.asOf,
    accountCurrency: accountSummary.currency,
    summary: {
      holdingsValue: accountSummary.currentValue,
      holdingsCost: accountSummary.totalCost,
      realizedProfitLoss: accountSummary.realizedProfitLoss,
      unrealizedProfitLoss: accountSummary.unrealizedProfitLoss,
      totalAccountValue: accountSummary.totalValue,
    },
    holdings,
    holdingHistory: buildHoldingHistory(
      snapshot,
      historicalOrders,
      historyInstruments,
    ),
  };
};

type MutableHoldingHistory = {
  name: string;
  isin: string;
  tickers: Set<string>;
  instrumentType: string | null;
  category: string | null;
  currentlyHeld: boolean;
  currentQuantity: number;
  purchases: PortfolioExportTransaction[];
  sales: PortfolioExportTransaction[];
};

const buildHoldingHistory = (
  snapshot: CurrentPortfolioSnapshot,
  historicalOrders: WebHistoricalOrder[],
  historyInstruments: PortfolioHistoryInstrument[],
): PortfolioExportHoldingHistory[] => {
  const histories = new Map<string, MutableHoldingHistory>();

  historyInstruments.forEach((instrument) => {
    histories.set(instrument.isin, {
      name: instrument.name,
      isin: instrument.isin,
      tickers: new Set(instrument.tickers),
      instrumentType: instrument.instrumentType,
      category: instrument.category,
      currentlyHeld: false,
      currentQuantity: 0,
      purchases: [],
      sales: [],
    });
  });

  snapshot.holdings.forEach((holding) => {
    const history = getOrCreateHistory(histories, {
      name: holding.name,
      isin: holding.isin,
      ticker: holding.ticker,
    });
    history.name = holding.name;
    history.tickers.add(holding.ticker);
    history.instrumentType = holding.instrumentType ?? history.instrumentType;
    history.category = holding.category ?? history.category;
    history.currentlyHeld = true;
    history.currentQuantity = holding.position.quantity;
  });

  historicalOrders.forEach((order) => {
    const side = order.side.trim().toUpperCase();
    if ((side !== 'BUY' && side !== 'SELL') || order.fills.length === 0) {
      return;
    }

    const history = getOrCreateHistory(histories, {
      name: order.instrument.name,
      isin: order.instrument.isin,
      ticker: order.ticker,
    });
    history.tickers.add(order.ticker);
    history.tickers.add(order.instrument.ticker);

    order.fills.forEach((fill) => {
      const transaction: PortfolioExportTransaction = {
        orderId: order.id,
        fillId: fill.id,
        filledAt: fill.filledAt,
        quantity: fill.quantity,
        unitPrice: fill.price,
        priceCurrency: order.instrument.currency,
        walletValue: fill.walletImpact.netValue,
        walletCurrency: fill.walletImpact.currency,
        walletFxRate: fill.walletImpact.fxRate,
        taxes: fill.walletImpact.taxes.map((tax) => ({ ...tax })),
      };

      (side === 'BUY' ? history.purchases : history.sales).push(transaction);
    });
  });

  return [...histories.values()]
    .filter(
      (history) =>
        history.currentlyHeld ||
        history.purchases.length > 0 ||
        history.sales.length > 0,
    )
    .map((history): PortfolioExportHoldingHistory => {
      history.purchases.sort(compareTransactions);
      history.sales.sort(compareTransactions);

      return {
        name: history.name,
        isin: history.isin,
        trading212Tickers: [...history.tickers].sort((left, right) =>
          left.localeCompare(right),
        ),
        instrumentType: history.instrumentType,
        category: history.category,
        currentlyHeld: history.currentlyHeld,
        currentQuantity: history.currentQuantity,
        firstPurchasedAt: history.purchases[0]?.filledAt ?? null,
        lastPurchasedAt: history.purchases.at(-1)?.filledAt ?? null,
        firstSoldAt: history.sales[0]?.filledAt ?? null,
        lastSoldAt: history.sales.at(-1)?.filledAt ?? null,
        purchases: history.purchases,
        sales: history.sales,
      };
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.isin.localeCompare(right.isin),
    );
};

const getOrCreateHistory = (
  histories: Map<string, MutableHoldingHistory>,
  identity: { name: string; isin: string; ticker: string },
) => {
  const existing = histories.get(identity.isin);
  if (existing) {
    return existing;
  }

  const history: MutableHoldingHistory = {
    name: identity.name,
    isin: identity.isin,
    tickers: new Set([identity.ticker]),
    instrumentType: null,
    category: null,
    currentlyHeld: false,
    currentQuantity: 0,
    purchases: [],
    sales: [],
  };
  histories.set(identity.isin, history);
  return history;
};

const compareTransactions = (
  left: PortfolioExportTransaction,
  right: PortfolioExportTransaction,
) => left.filledAt.localeCompare(right.filledAt) || left.fillId - right.fillId;

export { createExportCurrentPortfolio };
