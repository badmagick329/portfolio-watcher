import {
  createBrokerDataManager,
  createOrderSyncStateManager,
  createTrading212Client,
} from '@portfolio/infra';
import {
  createGetDistinctInstruments,
  createGetAppCapabilities,
  createGetLatestAccountSummarySnapshot,
  createGetLatestCurrentPositionSnapshot,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
  createGetLatestInstrumentRiskMetric,
  createListCategorizedInstruments,
  createSaveManualInstrumentPrice,
  createSetInstrumentCategories,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
  createUnsetInstrumentCategories,
} from '@portfolio/use-cases';

export const createWebServices = () => {
  const client = createTrading212Client();
  const dataManager = createBrokerDataManager();
  const syncStateManager = createOrderSyncStateManager();

  return {
    getAppCapabilities: createGetAppCapabilities({ dataManager }),
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
