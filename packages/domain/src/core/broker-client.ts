import type { Result, ResultAsync } from 'neverthrow';
import type {
  AppError,
  HistoricalOrdersParams,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
  SyncStepResult,
  WebHistoricalOrderInstrument,
  WebHistoricalOrdersFilters,
  WebHistoricalOrdersResult,
} from '../types';
import type {
  AccountCash,
  AccountSummary,
  Positions,
  HistoricalOrders,
  HistoricalOrdersItems,
} from '../types/schemas/api-responses';
import type {
  AccountSummarySnapshot,
  CurrentPositionSnapshot,
} from '../types';

type HistoricalOrdersInput = HistoricalOrdersParams | { nextPagePath: string };

interface BrokerClient {
  fetchAccountCash: () => ResultAsync<AccountCash, AppError>;
  fetchAccountSummary: () => ResultAsync<AccountSummary, AppError>;
  fetchHistoricalOrders: (
    input: HistoricalOrdersInput,
  ) => ResultAsync<HistoricalOrders, AppError>;
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
  saveInstrumentPriceSource(
    source: InstrumentPriceSource,
  ): ResultAsync<void, AppError>;
  getInstrumentPriceSourceByIsin(
    isin: string,
  ): ResultAsync<InstrumentPriceSource | undefined, AppError>;
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
  getLatestAccountSummarySnapshot(): ResultAsync<
    AccountSummarySnapshot | undefined,
    AppError
  >;
  getLatestInstrumentPriceByIsin(
    isin: string,
  ): ResultAsync<InstrumentPriceSnapshot | undefined, AppError>;
  listInstrumentsNeedingPriceRefresh(params: {
    fetchedBefore: string;
    failedAfter: string;
  }): ResultAsync<InstrumentPriceRefreshCandidate[], AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type {
  BrokerClient,
  BrokerClientWithCache,
  BrokerDataManager,
  HistoricalOrdersInput,
};
