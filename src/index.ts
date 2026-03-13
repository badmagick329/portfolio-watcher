import { createLoggerFactory } from '@/infra/console-logger';
import {
  createBrokerDataManager,
  createOrderSyncStateManager,
} from '@/infra/db';
import { createDiskCache } from '@/infra/disk-cache';
import { createTrading212ClientWithCache } from '@/infra/trading212-client';

const main = async () => {
  const loggerCreator = createLoggerFactory('info');
  const orderSyncStateManager = createOrderSyncStateManager();
  const brokerDataManager = createBrokerDataManager();

  createDiskCache({
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
    .asyncAndThen((client) => client.fetchHistoricalOrders({ limit: '50' }))
    .match(
      (json) => {
        console.log(json);
      },
      (e) => console.error(e),
    );
};

main();
