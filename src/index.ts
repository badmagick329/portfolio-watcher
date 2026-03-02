import { createLoggerFactory } from '@/infra/console-logger';
import { createDiskCache } from '@/infra/disk-cache';
import {
  createTrading212Client,
  createTrading212ClientWithCache,
} from '@/infra/trading212-client';

const main = async () => {
  const loggerCreator = createLoggerFactory('info');

  createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) => createTrading212ClientWithCache(cache))
    .asyncAndThen((client) => client.fetchHistoricalOrders({}))
    .match(
      (json) => {
        console.log(json);
      },
      (e) => console.error(e),
    );
};

main();
