type HistoricalOrdersParams = {
  cursor?: string;
  ticker?: string;
  limit?: string;
};

type WebHistoricalOrdersFilters = {
  createdFrom?: string;
  createdTo?: string;
  filledFrom?: string;
  filledTo?: string;
  ticker?: string;
  status?: string;
  side?: string;
  limit?: number;
  cursor?: string;
};

type WebHistoricalOrderTax = {
  name: string;
  quantity: number;
  currency: string;
  chargedAt: string;
};

type WebHistoricalOrderFill = {
  id: number;
  quantity: number;
  price: number;
  type: string;
  tradingMethod: string;
  filledAt: string;
  walletImpact: {
    currency: string;
    netValue: number;
    fxRate: number;
    taxes: WebHistoricalOrderTax[];
  };
};

type WebHistoricalOrderInstrument = {
  ticker: string;
  name: string;
  isin: string;
  currency: string;
};

type WebHistoricalOrder = {
  id: number;
  strategy: string;
  type: string;
  ticker: string;
  quantity: number | null;
  filledQuantity: number | null;
  value: number | null;
  filledValue: number | null;
  limitPrice: number | null;
  status: string;
  currency: string;
  extendedHours: boolean;
  initiatedFrom: string;
  side: string;
  createdAt: string;
  instrument: WebHistoricalOrderInstrument;
  fills: WebHistoricalOrderFill[];
};

type WebHistoricalOrdersResult = {
  items: WebHistoricalOrder[];
  filters: WebHistoricalOrdersFilters;
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
  WebHistoricalOrder,
  WebHistoricalOrderFill,
  WebHistoricalOrderInstrument,
  WebHistoricalOrdersFilters,
  WebHistoricalOrdersResult,
  WebHistoricalOrderTax,
};
