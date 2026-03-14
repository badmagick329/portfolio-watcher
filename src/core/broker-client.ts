import type { AppError, HistoricalOrdersParams, SyncStepResult } from '@/types';
import type {
  AccountCash,
  AccountSummary,
  HistoricalOrders,
  HistoricalOrdersItems,
} from '@/types/schemas/api-responses';
import type { Result, ResultAsync } from 'neverthrow';

interface BrokerClient {
  fetchAccountCash: () => ResultAsync<AccountCash, AppError>;
  fetchAccountSummary: () => ResultAsync<AccountSummary, AppError>;
  fetchHistoricalOrders: (
    params: HistoricalOrdersParams,
  ) => ResultAsync<HistoricalOrders, AppError>;
  endPoints: Record<
    string,
    string | ((params: HistoricalOrdersParams) => string)
  >;
  syncHistoricalOrders: () => ResultAsync<SyncStepResult, AppError>;
}

interface ClientCache {
  resetCache: () => Result<void, AppError>;
}

interface BrokerDataManager {
  saveHistoricalOrders(
    historicalOrdersItems: HistoricalOrdersItems,
  ): ResultAsync<number, AppError>;
  getHistoricalOrders(): ResultAsync<HistoricalOrdersItems, AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type { BrokerClient, BrokerClientWithCache, BrokerDataManager };
