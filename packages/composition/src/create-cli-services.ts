import {
  createBrokerDataManager,
  createDiskCache,
  createLoggerFactory,
  createOrderSyncStateManager,
  createTrading212ClientWithCache,
} from '@portfolio/infra';
import { createSyncHistoricalOrders } from '../../use-cases/sync-historical-orders';

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
      syncHistoricalOrders: createSyncHistoricalOrders({
        client,
        dataManager,
        syncStateManager,
      }),
    }));
};
