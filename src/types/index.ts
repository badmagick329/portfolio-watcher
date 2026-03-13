type AppErrorCodes = 'FILE_IO' | 'API' | 'NETWORK' | 'RATE_LIMIT' | 'DATABASE';
type AppError = { code: AppErrorCodes; message: string };

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

export type { AppError, HistoricalOrdersParams, RateLimitResponse };
