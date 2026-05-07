import type { Result, ResultAsync } from 'neverthrow';
import type {
  AppError,
  AppDataState,
  HistoricalOrdersParams,
  CategorizedInstrument,
  InstrumentProviderSymbol,
  InstrumentRiskMetricSnapshot,
  InstrumentRiskMetricSyncStatus,
  InstrumentProviderResolutionCandidate,
  InstrumentProviderResolutionStatus,
  InstrumentRiskProfile,
  InstrumentRiskProvider,
  InstrumentRiskSearchCandidate,
  InstrumentCategoryFilter,
  InstrumentCategoryInstrument,
  CurrentHoldingMoversInput,
  CurrentHoldingMoversResult,
  InstrumentPriceSnapshot,
  ObservedInstrumentListing,
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
  LimitOrderResponse,
  MarketOrderResponse,
  Positions,
} from '../types/schemas/api-responses';
import type {
  AccountSummarySnapshot,
  OrderExecutionAttempt,
  CurrentPositionSnapshot,
  T212InstrumentCatalogItem,
  T212LimitOrderRequest,
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
  placeLimitOrder: (
    input: T212LimitOrderRequest,
  ) => ResultAsync<LimitOrderResponse, AppError>;
  fetchPositions: () => ResultAsync<Positions, AppError>;
}

interface InstrumentRiskClient {
  fetchInstrumentRiskProfile: (
    symbol: string,
  ) => ResultAsync<InstrumentRiskProfile, AppError>;
  searchInstrumentRiskCandidatesByIsin: (
    isin: string,
  ) => ResultAsync<InstrumentRiskSearchCandidate[], AppError>;
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
  getAppDataState(): ResultAsync<AppDataState, AppError>;
  saveInstrumentPriceSnapshot(
    snapshot: InstrumentPriceSnapshot,
  ): ResultAsync<void, AppError>;
  saveCurrentPositionSnapshot(
    snapshot: CurrentPositionSnapshot,
  ): ResultAsync<void, AppError>;
  saveObservedInstrumentListing(
    listing: ObservedInstrumentListing,
  ): ResultAsync<void, AppError>;
  getLatestPortfolioSnapshotAsOf(): ResultAsync<string | undefined, AppError>;
  getLatestCurrentPortfolioPositionSnapshotByIsin(
    isin: string,
  ): ResultAsync<CurrentPositionSnapshot | undefined, AppError>;
  getLatestCurrentPositionSnapshotByIsin(
    isin: string,
  ): ResultAsync<CurrentPositionSnapshot | undefined, AppError>;
  saveAccountSummarySnapshot(
    snapshot: AccountSummarySnapshot,
  ): ResultAsync<void, AppError>;
  prunePortfolioStateSnapshotsOlderThan(
    cutoffAsOf: string,
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
  getCurrentHoldingMovers(
    input?: CurrentHoldingMoversInput,
  ): ResultAsync<CurrentHoldingMoversResult, AppError>;
  findInstrumentCategoryInstrumentMatches(
    input: string,
  ): ResultAsync<InstrumentCategoryInstrument[], AppError>;
  setInstrumentCategory(
    isin: string,
    category: string,
  ): ResultAsync<void, AppError>;
  unsetInstrumentCategory(isin: string): ResultAsync<void, AppError>;
  setInstrumentCategories(
    isins: string[],
    category: string,
  ): ResultAsync<void, AppError>;
  unsetInstrumentCategories(isins: string[]): ResultAsync<void, AppError>;
  listCategorizedInstruments(
    filters?: InstrumentCategoryFilter,
  ): ResultAsync<CategorizedInstrument[], AppError>;
  setInstrumentProviderSymbol(
    params: Pick<InstrumentProviderSymbol, 'isin' | 'provider' | 'providerSymbol'>,
  ): ResultAsync<void, AppError>;
  unsetInstrumentProviderSymbol(
    isin: string,
    provider: InstrumentRiskProvider,
  ): ResultAsync<void, AppError>;
  listInstrumentProviderSymbols(
    provider?: InstrumentRiskProvider,
  ): ResultAsync<InstrumentProviderSymbol[], AppError>;
  getInstrumentProviderSymbol(
    isin: string,
    provider: InstrumentRiskProvider,
  ): ResultAsync<InstrumentProviderSymbol | undefined, AppError>;
  saveInstrumentProviderResolutionStatus(
    status: Omit<InstrumentProviderResolutionStatus, 'updatedAt'>,
  ): ResultAsync<void, AppError>;
  getInstrumentProviderResolutionStatus(
    isin: string,
    provider: InstrumentRiskProvider,
  ): ResultAsync<InstrumentProviderResolutionStatus | undefined, AppError>;
  listInstrumentProviderResolutionStatuses(
    provider?: InstrumentRiskProvider,
  ): ResultAsync<InstrumentProviderResolutionStatus[], AppError>;
  replaceInstrumentProviderResolutionCandidates(input: {
    isin: string;
    provider: InstrumentRiskProvider;
    candidates: Array<
      Omit<InstrumentProviderResolutionCandidate, 'isin' | 'provider'>
    >;
  }): ResultAsync<void, AppError>;
  listInstrumentProviderResolutionCandidates(
    provider?: InstrumentRiskProvider,
  ): ResultAsync<InstrumentProviderResolutionCandidate[], AppError>;
  saveInstrumentRiskMetricSnapshot(
    snapshot: InstrumentRiskMetricSnapshot,
  ): ResultAsync<void, AppError>;
  getLatestInstrumentRiskMetricByIsin(
    isin: string,
    provider: InstrumentRiskProvider,
  ): ResultAsync<InstrumentRiskMetricSnapshot | undefined, AppError>;
  saveInstrumentRiskMetricSyncStatus(
    status: InstrumentRiskMetricSyncStatus,
  ): ResultAsync<void, AppError>;
  getInstrumentRiskMetricSyncStatus(
    input: Pick<
      InstrumentRiskMetricSyncStatus,
      'isin' | 'provider' | 'providerSymbol'
    >,
  ): ResultAsync<InstrumentRiskMetricSyncStatus | undefined, AppError>;
  listInstrumentRiskMetricSyncStatuses(
    provider?: InstrumentRiskProvider,
  ): ResultAsync<InstrumentRiskMetricSyncStatus[], AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type {
  BrokerClient,
  BrokerClientWithCache,
  BrokerDataManager,
  HistoricalOrdersInput,
  InstrumentRiskClient,
};
