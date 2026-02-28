import type { AppError } from '@/types';
import type {
  AccountCash,
  AccountSummary,
} from '@/types/schemas/api-responses';
import type { Result, ResultAsync } from 'neverthrow';

interface BrokerClient {
  fetchAccountCash: () => ResultAsync<AccountCash, AppError>;
  fetchAccountSummary: () => ResultAsync<AccountSummary, AppError>;
  endPoints: Record<string, string>;
}

interface ClientCache {
  resetCache: () => Result<void, AppError>;
}

type BrokerClientWithCache = BrokerClient & ClientCache;

export type { BrokerClient, BrokerClientWithCache };
