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
  createListCategorizedInstruments,
  createPlaceLiveLimitOrder,
  createPlaceLiveMarketOrder,
  createResolveInstrumentForOrder,
  createSetInstrumentCategory,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
  createUnsetInstrumentCategory,
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
      listCategorizedInstruments: createListCategorizedInstruments(dataManager),
      setInstrumentCategory: createSetInstrumentCategory(dataManager),
      unsetInstrumentCategory: createUnsetInstrumentCategory(dataManager),
      placeLiveMarketOrder: createPlaceLiveMarketOrder({
        client: liveClient,
        dataManager,
        resolveInstrumentForOrder: createResolveInstrumentForOrder({
          client: liveClient,
          dataManager,
        }),
      }),
      placeLiveLimitOrder: createPlaceLiveLimitOrder({
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
