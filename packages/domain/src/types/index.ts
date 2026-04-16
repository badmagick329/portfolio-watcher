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

type InstrumentCategoryInstrument = WebHistoricalOrderInstrument;

type CategorizedInstrument = InstrumentCategoryInstrument & {
  category: string | null;
};

type InstrumentCategoryFilter = {
  includeCategories?: string[];
  excludeCategories?: string[];
};

type SetInstrumentCategoryInput = {
  instrument: string;
  category: string;
};

type UnsetInstrumentCategoryInput = {
  instrument: string;
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

type CurrentPositionSnapshot = {
  isin: string;
  providerSymbol: string;
  quantity: number;
  currentPrice: number;
  instrumentCurrency: string;
  walletCurrency: string;
  currentValue: number;
  totalCost: number;
  unrealizedProfitLoss: number;
  fxImpact: number | null;
  asOf: string;
  fetchedAt: string;
};

type AccountSummarySnapshot = {
  currency: string;
  currentValue: number;
  totalCost: number;
  realizedProfitLoss: number;
  unrealizedProfitLoss: number;
  totalValue: number;
  asOf: string;
  fetchedAt: string;
};

type BrokerEnvironment = 'live' | 'demo';

type T212InstrumentMetadataItem = {
  addedOn: string | null;
  extendedHours: boolean;
  ticker: string;
  isin: string;
  maxOpenQuantity: number | null;
  name: string;
  shortName: string | null;
  type: string | null;
  currencyCode: string;
};

type T212InstrumentCatalogItem = {
  ticker: string;
  isin: string;
  name: string;
  shortName: string | null;
  instrumentType: string | null;
  currencyCode: string;
  extendedHours: boolean;
  maxOpenQuantity: number | null;
  addedOn: string | null;
  fetchedAt: string;
};

type T212MarketOrderRequest = {
  ticker: string;
  quantity: number;
  extendedHours: boolean;
};

type T212LimitOrderRequest = {
  ticker: string;
  quantity: number;
  limitPrice: number;
  timeValidity: 'DAY';
};

type T212OrderResponse = {
  id: number;
  ticker: string;
  quantity: number | null;
  filledQuantity: number | null;
  status: string;
  side: string;
  createdAt: string;
  limitPrice?: number | null;
  timeInForce?: string | null;
  type?: string | null;
};

type T212MarketOrderResponse = T212OrderResponse;
type T212LimitOrderResponse = T212OrderResponse;

type OrderExecutionAttempt = {
  orderType: 'market' | 'limit';
  environment: BrokerEnvironment;
  instrumentInput: string;
  resolvedTicker: string;
  resolvedIsin: string;
  resolvedName: string;
  side: 'buy' | 'sell';
  requestedMode: 'quantity' | 'value';
  requestedQuantity: number | null;
  requestedValue: number | null;
  derivedQuantity: number;
  referencePrice: number | null;
  extendedHours: boolean;
  limitPrice: number | null;
  timeValidity: 'DAY' | null;
  executionMode: 'dry_run' | 'submitted';
  brokerRequestPayload: string;
  brokerResponsePayload: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptedAt: string;
};

type ResolvedOrderInstrument = {
  ticker: string;
  isin: string;
  name: string;
  currencyCode: string;
};

type PlaceMarketOrderInput = {
  instrument: string;
  side: 'buy' | 'sell';
  quantity?: number;
  value?: number;
  extendedHours?: boolean;
  confirm?: boolean;
};

type PlaceMarketOrderResult = {
  environment: 'live';
  executionMode: 'dry_run' | 'submitted';
  resolvedInstrument: ResolvedOrderInstrument;
  requestedMode: 'quantity' | 'value';
  requestedQuantity: number | null;
  requestedValue: number | null;
  derivedQuantity: number;
  referencePrice: number | null;
  extendedHours: boolean;
  brokerOrder: T212MarketOrderResponse | null;
};

type PlaceLimitOrderInput = {
  instrument: string;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  confirm?: boolean;
};

type PlaceLimitOrderResult = {
  environment: 'live';
  executionMode: 'dry_run' | 'submitted';
  resolvedInstrument: ResolvedOrderInstrument;
  requestedMode: 'quantity';
  requestedQuantity: number;
  requestedValue: null;
  derivedQuantity: number;
  referencePrice: null;
  extendedHours: false;
  limitPrice: number;
  timeValidity: 'DAY';
  brokerOrder: T212LimitOrderResponse | null;
};

type InstrumentPriceProvider = 'fmp' | 'eodhd' | 'manual' | 't212';

type InstrumentPriceType =
  | 'eod'
  | 'delayed_latest'
  | 'manual'
  | 'position_current';

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

type CurrentPositionPriceSyncResult = {
  attempted: number;
  persisted: number;
};

type PortfolioStateSyncResult = {
  attemptedPositions: number;
  persistedPrices: number;
  persistedPositions: number;
  persistedAccountSummaries: number;
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
  | { code: 'VALIDATION'; message: string }
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
  AccountSummarySnapshot,
  BrokerEnvironment,
  T212InstrumentMetadataItem,
  T212InstrumentCatalogItem,
  T212MarketOrderRequest,
  T212LimitOrderRequest,
  T212OrderResponse,
  T212MarketOrderResponse,
  T212LimitOrderResponse,
  OrderExecutionAttempt,
  PlaceMarketOrderInput,
  PlaceMarketOrderResult,
  PlaceLimitOrderInput,
  PlaceLimitOrderResult,
  ResolvedOrderInstrument,
  CurrentPositionSnapshot,
  InstrumentPriceProvider,
  InstrumentPriceSnapshot,
  InstrumentPriceType,
  CurrentPositionPriceSyncResult,
  PortfolioStateSyncResult,
  HistoricalOrdersParams,
  RateLimitResponse,
  SyncStepResult,
  WebHistoricalOrder,
  WebHistoricalOrderFill,
  WebHistoricalOrderInstrument,
  InstrumentCategoryInstrument,
  CategorizedInstrument,
  InstrumentCategoryFilter,
  SetInstrumentCategoryInput,
  UnsetInstrumentCategoryInput,
  WebHistoricalOrdersFilters,
  WebHistoricalOrdersResult,
  WebHistoricalOrderTax,
};
