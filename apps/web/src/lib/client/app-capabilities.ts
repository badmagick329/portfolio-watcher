import type { AppCapabilities } from '@portfolio/domain';

type AppCapabilitiesData = AppCapabilities;

const EMPTY_APP_CAPABILITIES: AppCapabilitiesData = {
  hasBrokerCredentials: false,
  canSyncOrders: false,
  canSyncPortfolioState: false,
  canPlaceOrders: false,
  hasFmpApiKey: false,
  canSyncRiskMetrics: false,
  brokerAccessMode: 'missing',
  hasHistoricalOrders: false,
  hasCurrentHoldings: false,
  hasCategories: false,
  hasStoredRiskMetrics: false,
  hasSuccessfulSubmittedOrderAttempt: false,
  lastOrdersSyncAt: null,
  lastPortfolioSyncAt: null,
  lastRiskMetricsSyncAt: null,
};

export { EMPTY_APP_CAPABILITIES };
export type { AppCapabilitiesData };
