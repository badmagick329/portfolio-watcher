import type { AppCapabilities, AppDataState, AppError, BrokerDataManager } from '@portfolio/domain';

type Params = {
  dataManager: Pick<BrokerDataManager, 'getAppDataState'>;
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
  dataManager.getAppDataState().map((dataState): AppCapabilities =>
    toAppCapabilities(dataState, config),
  );

const toAppCapabilities = (
  dataState: AppDataState,
  config: NonNullable<Params['config']>,
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
    canSyncRiskMetrics: hasFmpApiKey,
    brokerAccessMode,
  };
};

export { createGetAppCapabilities };
