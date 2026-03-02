type AppErrorCodes = 'FILE_IO' | 'API' | 'NETWORK';
type AppError = { code: AppErrorCodes; message: string };

type HistoricalOrdersParams = {
  cursor?: string;
  ticker?: string;
  limit?: string;
};

export type { AppError, HistoricalOrdersParams };
