import type { OrderSyncState } from '@/core/order-sync-state';
import type { AppError, HistoricalOrdersParams } from '@/types';
import type {
  AccountCash,
  AccountSummary,
  HistoricalOrders,
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
  syncHistoricalOrders: () => ResultAsync<OrderSyncState, AppError>;
}

interface ClientCache {
  resetCache: () => Result<void, AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type { BrokerClient, BrokerClientWithCache };
