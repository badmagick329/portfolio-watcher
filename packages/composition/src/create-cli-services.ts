import {
  createBrokerDataManager,
  createDiskCache,
  createLoggerFactory,
  createOrderSyncStateManager,
  createTrading212Client,
  createTrading212ClientWithCache,
} from '@portfolio/infra';
import {
  createFetchAccountCash,
  createFetchAccountSummary,
  createPlaceDemoMarketOrder,
  createResolveInstrumentForOrder,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
} from '@portfolio/use-cases';

export const createCliServices = () => {
  const loggerCreator = createLoggerFactory('info');
  const syncStateManager = createOrderSyncStateManager();
  const dataManager = createBrokerDataManager();
  const demoClient = createTrading212Client();

  return createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) => createTrading212ClientWithCache(cache))
    .map((client) => ({
      fetchAccountCash: createFetchAccountCash(client),
      fetchAccountSummary: createFetchAccountSummary(client),
      placeDemoMarketOrder: createPlaceDemoMarketOrder({
        client: demoClient,
        dataManager,
        resolveInstrumentForOrder: createResolveInstrumentForOrder({
          client: demoClient,
          dataManager,
        }),
      }),
      syncInstrumentPrices: createSyncCurrentPositionPricesFromT212({
        client,
        dataManager,
      }),
      syncT212InstrumentCatalog: createSyncT212InstrumentCatalog({
        client: demoClient,
        dataManager,
      }),
      syncHistoricalOrders: createSyncHistoricalOrders({
        client,
        dataManager,
        syncStateManager,
      }),
    }));
};
