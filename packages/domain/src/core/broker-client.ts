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
  HistoricalOrders,
  HistoricalOrdersItems,
} from '../types/schemas/api-responses';

type HistoricalOrdersInput = HistoricalOrdersParams | { nextPagePath: string };

interface BrokerClient {
  fetchAccountCash: () => ResultAsync<AccountCash, AppError>;
  fetchAccountSummary: () => ResultAsync<AccountSummary, AppError>;
  fetchHistoricalOrders: (
    input: HistoricalOrdersInput,
  ) => ResultAsync<HistoricalOrders, AppError>;
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
