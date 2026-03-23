import type { Result, ResultAsync } from 'neverthrow';
import type {
  AppError,
  HistoricalOrdersParams,
  SyncStepResult,
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
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type {
  BrokerClient,
  BrokerClientWithCache,
  BrokerDataManager,
  HistoricalOrdersInput,
};
