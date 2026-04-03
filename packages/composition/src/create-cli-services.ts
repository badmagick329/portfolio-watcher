import {
  createBrokerDataManager,
  createDiskCache,
  createLoggerFactory,
  createOrderSyncStateManager,
  createTrading212ClientWithCache,
} from '@portfolio/infra';
import {
  createFetchAccountCash,
  createFetchAccountSummary,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
} from '@portfolio/use-cases';

export const createCliServices = () => {
  const loggerCreator = createLoggerFactory('info');
  const syncStateManager = createOrderSyncStateManager();
  const dataManager = createBrokerDataManager();

  return createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) => createTrading212ClientWithCache(cache))
    .map((client) => ({
      fetchAccountCash: createFetchAccountCash(client),
      fetchAccountSummary: createFetchAccountSummary(client),
      syncInstrumentPrices: createSyncCurrentPositionPricesFromT212({
        client,
        dataManager,
      }),
      syncHistoricalOrders: createSyncHistoricalOrders({
        client,
        dataManager,
        syncStateManager,
      }),
    }));
};
