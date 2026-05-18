import type { AppCapabilities, AppDataState, AppError, BrokerDataManager } from '@portfolio/domain';

type Params = {
  dataManager: Pick<BrokerDataManager, 'getAppDataState' | 'getFeatureFlag'>;
  config?: {
    apiKey?: string;
    apiSecret?: string;
    fmpApiKey?: string;
  };
};

const createGetAppCapabilities = ({
  dataManager,
  config = {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    fmpApiKey: process.env.FMP_API_KEY,
  },
}: Params) => () =>
  dataManager.getAppDataState().andThen((dataState) =>
    dataManager
      .getFeatureFlag('risk_metrics_enabled')
      .map((riskMetricsFeatureEnabled): AppCapabilities =>
        toAppCapabilities(dataState, config, riskMetricsFeatureEnabled),
      ),
  );

const toAppCapabilities = (
  dataState: AppDataState,
  config: NonNullable<Params['config']>,
  riskMetricsFeatureEnabled: boolean,
): AppCapabilities => {
  const hasBrokerCredentials =
    Boolean(config.apiKey?.trim()) && Boolean(config.apiSecret?.trim());
  const hasFmpApiKey = Boolean(config.fmpApiKey?.trim());
  const brokerAccessMode = !hasBrokerCredentials
    ? 'missing'
    : dataState.hasSuccessfulSubmittedOrderAttempt
      ? 'trading_enabled'
      : 'read_only_or_unknown';

  return {
    ...dataState,
    hasBrokerCredentials,
    canSyncOrders: hasBrokerCredentials,
    canSyncPortfolioState: hasBrokerCredentials,
    canPlaceOrders: hasBrokerCredentials,
    hasFmpApiKey,
    riskMetricsFeatureEnabled,
    canSyncRiskMetrics: hasFmpApiKey && riskMetricsFeatureEnabled,
    brokerAccessMode,
  };
};

export { createGetAppCapabilities };
