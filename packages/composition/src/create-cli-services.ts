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
  createPlaceLiveMarketOrder,
  createResolveInstrumentForOrder,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
} from '@portfolio/use-cases';

export const createCliServices = () => {
  const loggerCreator = createLoggerFactory('info');
  const syncStateManager = createOrderSyncStateManager();
  const dataManager = createBrokerDataManager();
  const liveClient = createTrading212Client();

  return createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) => createTrading212ClientWithCache(cache))
    .map((client) => ({
      fetchAccountCash: createFetchAccountCash(client),
      fetchAccountSummary: createFetchAccountSummary(client),
      placeLiveMarketOrder: createPlaceLiveMarketOrder({
        client: liveClient,
        dataManager,
        resolveInstrumentForOrder: createResolveInstrumentForOrder({
          client: liveClient,
          dataManager,
        }),
      }),
      syncInstrumentPrices: createSyncCurrentPositionPricesFromT212({
        client,
        dataManager,
      }),
      syncT212InstrumentCatalog: createSyncT212InstrumentCatalog({
        client: liveClient,
        dataManager,
      }),
      syncHistoricalOrders: createSyncHistoricalOrders({
        client,
        dataManager,
        syncStateManager,
      }),
    }));
};
