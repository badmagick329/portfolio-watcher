import {
  createBrokerDataManager,
  createFmpClient,
  createOrderSyncStateManager,
  createTrading212Client,
} from '@portfolio/infra';
import {
  createClearInstrumentProviderResolution,
  createConfirmInstrumentProviderResolution,
  createGetCurrentHoldingMovers,
  createGetDistinctInstruments,
  createGetAppCapabilities,
  createGetLatestAccountSummarySnapshot,
  createGetLatestCurrentPositionSnapshot,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
  createGetLatestInstrumentRiskMetric,
  createListCategorizedInstruments,
  createListInstrumentProviderResolutionCandidates,
  createListInstrumentProviderResolutionStatuses,
  createListInstrumentProviderSymbols,
  createListInstrumentRiskMetricSyncStatuses,
  createResolveInstrumentProviderMappings,
  createSaveManualInstrumentPrice,
  createSetInstrumentCategories,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
  createUnsetInstrumentCategories,
} from '@portfolio/use-cases';

export const createWebServices = () => {
  const client = createTrading212Client();
  const fmpClient = createFmpClient();
  const dataManager = createBrokerDataManager();
  const syncStateManager = createOrderSyncStateManager();

  return {
    clearInstrumentProviderResolution:
      createClearInstrumentProviderResolution(dataManager),
    confirmInstrumentProviderResolution:
      createConfirmInstrumentProviderResolution(dataManager),
    getAppCapabilities: createGetAppCapabilities({ dataManager }),
    getCurrentHoldingMovers: createGetCurrentHoldingMovers(dataManager),
    getDistinctInstruments: createGetDistinctInstruments(dataManager),
    getHistoricalOrdersForWeb: createGetHistoricalOrdersForWeb(dataManager),
    getLatestAccountSummarySnapshot:
      createGetLatestAccountSummarySnapshot(dataManager),
    getLatestCurrentPositionSnapshot:
      createGetLatestCurrentPositionSnapshot(dataManager),
    getLatestInstrumentPrice: createGetLatestInstrumentPrice(dataManager),
    getLatestInstrumentRiskMetric:
      createGetLatestInstrumentRiskMetric(dataManager),
    listCategorizedInstruments: createListCategorizedInstruments(dataManager),
    listInstrumentProviderResolutionCandidates:
      createListInstrumentProviderResolutionCandidates(dataManager),
    listInstrumentProviderResolutionStatuses:
      createListInstrumentProviderResolutionStatuses(dataManager),
    listInstrumentProviderSymbols:
      createListInstrumentProviderSymbols(dataManager),
    listInstrumentRiskMetricSyncStatuses:
      createListInstrumentRiskMetricSyncStatuses(dataManager),
    resolveInstrumentProviderMappings: createResolveInstrumentProviderMappings({
      client: fmpClient,
      dataManager,
    }),
    saveManualInstrumentPrice: createSaveManualInstrumentPrice({ dataManager }),
    setInstrumentCategories: createSetInstrumentCategories(dataManager),
    unsetInstrumentCategories: createUnsetInstrumentCategories(dataManager),
    syncHistoricalOrders: createSyncHistoricalOrders({
      client,
      dataManager,
      syncStateManager,
    }),
    syncT212InstrumentCatalog: createSyncT212InstrumentCatalog({
      client,
      dataManager,
    }),
    syncPortfolioState: createSyncCurrentPositionPricesFromT212({
      client,
      dataManager,
    }),
  };
};
