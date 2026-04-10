import type { Result, ResultAsync } from 'neverthrow';
import type {
  AppError,
  HistoricalOrdersParams,
  InstrumentPriceSnapshot,
  SyncStepResult,
  WebHistoricalOrderInstrument,
  WebHistoricalOrdersFilters,
  WebHistoricalOrdersResult,
} from '../types';
import type {
  AccountCash,
  AccountSummary,
  HistoricalOrders,
  HistoricalOrdersItems,
  InstrumentsMetadata,
  MarketOrderResponse,
  Positions,
} from '../types/schemas/api-responses';
import type {
  AccountSummarySnapshot,
  OrderExecutionAttempt,
  CurrentPositionSnapshot,
  T212InstrumentCatalogItem,
  T212MarketOrderRequest,
} from '../types';

type HistoricalOrdersInput = HistoricalOrdersParams | { nextPagePath: string };

interface BrokerClient {
  fetchAccountCash: () => ResultAsync<AccountCash, AppError>;
  fetchAccountSummary: () => ResultAsync<AccountSummary, AppError>;
  fetchHistoricalOrders: (
    input: HistoricalOrdersInput,
  ) => ResultAsync<HistoricalOrders, AppError>;
  fetchInstrumentsMetadata: () => ResultAsync<InstrumentsMetadata, AppError>;
  placeMarketOrder: (
    input: T212MarketOrderRequest,
  ) => ResultAsync<MarketOrderResponse, AppError>;
  fetchPositions: () => ResultAsync<Positions, AppError>;
}

interface ClientCache {
  resetCache: () => Result<void, AppError>;
}

interface BrokerDataManager {
  saveHistoricalOrders(
    historicalOrdersItems: HistoricalOrdersItems,
  ): ResultAsync<number, AppError>;
  getHistoricalOrders(): ResultAsync<HistoricalOrdersItems, AppError>;
  getHistoricalOrdersForWeb(
    filters?: WebHistoricalOrdersFilters,
  ): ResultAsync<WebHistoricalOrdersResult, AppError>;
  getDistinctInstruments(): ResultAsync<WebHistoricalOrderInstrument[], AppError>;
  saveInstrumentPriceSnapshot(
    snapshot: InstrumentPriceSnapshot,
  ): ResultAsync<void, AppError>;
  saveCurrentPositionSnapshot(
    snapshot: CurrentPositionSnapshot,
  ): ResultAsync<void, AppError>;
  getLatestCurrentPositionSnapshotByIsin(
    isin: string,
  ): ResultAsync<CurrentPositionSnapshot | undefined, AppError>;
  saveAccountSummarySnapshot(
    snapshot: AccountSummarySnapshot,
  ): ResultAsync<void, AppError>;
  saveOrderExecutionAttempt(
    attempt: OrderExecutionAttempt,
  ): ResultAsync<void, AppError>;
  saveT212InstrumentCatalogItems(
    items: T212InstrumentCatalogItem[],
  ): ResultAsync<number, AppError>;
  findT212InstrumentCatalogMatches(
    input: string,
  ): ResultAsync<T212InstrumentCatalogItem[], AppError>;
  getLatestAccountSummarySnapshot(): ResultAsync<
    AccountSummarySnapshot | undefined,
    AppError
  >;
  getLatestInstrumentPriceByIsin(
    isin: string,
  ): ResultAsync<InstrumentPriceSnapshot | undefined, AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type {
  BrokerClient,
  BrokerClientWithCache,
  BrokerDataManager,
  HistoricalOrdersInput,
};
