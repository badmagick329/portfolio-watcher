import {
  createBrokerDataManager,
  createDiskCache,
  createFmpClient,
  createLoggerFactory,
  createOrderSyncStateManager,
  createTrading212Client,
  createTrading212ClientWithCache,
} from '@portfolio/infra';
import {
  createFetchAccountCash,
  createFetchAccountSummary,
  createListInstrumentProviderSymbols,
  createListCategorizedInstruments,
  createPlaceLiveLimitOrder,
  createPlaceLiveMarketOrder,
  createResolveInstrumentForOrder,
  createSetInstrumentCategory,
  createSetInstrumentProviderSymbol,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncInstrumentRiskMetrics,
  createSyncT212InstrumentCatalog,
  createUnsetInstrumentCategory,
  createUnsetInstrumentProviderSymbol,
} from '@portfolio/use-cases';

export const createCliServices = () => {
  const loggerCreator = createLoggerFactory('info');
  const syncStateManager = createOrderSyncStateManager();
  const dataManager = createBrokerDataManager();
  const liveClient = createTrading212Client();
  const fmpClient = createFmpClient();

  return createDiskCache({
    cacheFilePath: './data/cache.json',
    expirationPeriodInSeconds: 10,
    loggerCreator,
  })
    .map((cache) => createTrading212ClientWithCache(cache))
    .map((client) => ({
      fetchAccountCash: createFetchAccountCash(client),
      fetchAccountSummary: createFetchAccountSummary(client),
      listInstrumentProviderSymbols:
        createListInstrumentProviderSymbols(dataManager),
      listCategorizedInstruments: createListCategorizedInstruments(dataManager),
      setInstrumentCategory: createSetInstrumentCategory(dataManager),
      setInstrumentProviderSymbol:
        createSetInstrumentProviderSymbol(dataManager),
      unsetInstrumentCategory: createUnsetInstrumentCategory(dataManager),
      unsetInstrumentProviderSymbol:
        createUnsetInstrumentProviderSymbol(dataManager),
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
      syncInstrumentRiskMetrics: createSyncInstrumentRiskMetrics({
        client: fmpClient,
        dataManager,
      }),
    }));
};
