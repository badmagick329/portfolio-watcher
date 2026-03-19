import {
  createBrokerDataManager,
  createDiskCache,
  createLoggerFactory,
  createOrderSyncStateManager,
  createTrading212ClientWithCache,
} from '@portfolio/infra';

export const createCliServices = () => {
  const loggerCreator = createLoggerFactory('info');
  const orderSyncStateManager = createOrderSyncStateManager();
  const brokerDataManager = createBrokerDataManager();

  return createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) =>
      createTrading212ClientWithCache(
        orderSyncStateManager,
        brokerDataManager,
        cache,
      ),
    )
    .map((client) => ({
      syncHistoricalOrders: client.syncHistoricalOrders,
    }));
};
