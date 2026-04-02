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

type InstrumentPriceProvider = 'fmp' | 'eodhd' | 'manual';

type InstrumentPriceType = 'eod' | 'delayed_latest' | 'manual';

type InstrumentPriceSource = {
  isin: string;
  provider: InstrumentPriceProvider;
  providerSymbol: string;
  providerExchange: string;
  providerMic: string | null;
  resolvedName: string;
  resolvedCurrency: string | null;
  resolutionConfidence: number;
  lastResolvedAt: string;
  lastFetchStatus: 'ok' | 'failed' | null;
  lastFetchError: string | null;
  lastFetchAttemptedAt: string | null;
  consecutiveFailures: number;
};

type InstrumentPriceSnapshot = {
  isin: string;
  provider: InstrumentPriceProvider;
  providerSymbol: string;
  currency: string;
  price: number;
  priceType: InstrumentPriceType;
  asOf: string;
  fetchedAt: string;
};

type InstrumentPriceResolution = {
  isin: string;
  provider: InstrumentPriceProvider;
  providerSymbol: string;
  providerExchange: string;
  providerMic: string | null;
  resolvedName: string;
  resolvedCurrency: string | null;
  resolutionConfidence: number;
  isPrimary: boolean;
};

type InstrumentPriceFetchResult = {
  provider: InstrumentPriceProvider;
  providerSymbol: string;
  currency: string;
  price: number;
  priceType: InstrumentPriceType;
  asOf: string;
};

type InstrumentPriceRefreshCandidate = WebHistoricalOrderInstrument & {
  latestPriceFetchedAt: string | null;
  priceSource: InstrumentPriceSource | null;
};

type InstrumentPriceSyncResult = {
  attempted: number;
  refreshed: number;
  skipped: number;
  resolved: number;
  unresolved: number;
  fetchFailed: number;
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
  InstrumentPriceFetchResult,
  InstrumentPriceProvider,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceResolution,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
  InstrumentPriceSyncResult,
  InstrumentPriceType,
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
