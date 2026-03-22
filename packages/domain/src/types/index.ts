type HistoricalOrdersParams = {
  cursor?: string;
  ticker?: string;
  limit?: string;
};

type RateLimitResponse = {
  rateLimitLimit: number;
  rateLimitPeriodSec: number;
  rateLimitRemaining: number;
  rateLimitResetEpoch: number;
  rateLimitUsed: number;
};

type AppError =
  | { code: 'FILE_IO'; message: string }
  | { code: 'API'; message: string }
  | { code: 'NETWORK'; message: string }
  | { code: 'RATE_LIMIT'; message: string; rateLimitResponse: RateLimitResponse }
  | { code: 'FORBIDDEN'; message: string }
  | { code: 'DATABASE'; message: string };

type SyncStepResult =
  | 'rate_limited'
  | 'page_processed'
  | 'backfill_completed'
  | 'in_sync';

export type {
  AppError,
  HistoricalOrdersParams,
  RateLimitResponse,
  SyncStepResult,
};
