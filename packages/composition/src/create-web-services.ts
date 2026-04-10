import {
  createBrokerDataManager,
  createOrderSyncStateManager,
  createTrading212Client,
} from '@portfolio/infra';
import {
  createGetDistinctInstruments,
  createGetLatestAccountSummarySnapshot,
  createGetLatestCurrentPositionSnapshot,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
  createSaveManualInstrumentPrice,
  createSyncCurrentPositionPricesFromT212,
  createSyncHistoricalOrders,
  createSyncT212InstrumentCatalog,
} from '@portfolio/use-cases';

export const createWebServices = () => {
  const client = createTrading212Client();
  const dataManager = createBrokerDataManager();
  const syncStateManager = createOrderSyncStateManager();

  return {
    getDistinctInstruments: createGetDistinctInstruments(dataManager),
    getHistoricalOrdersForWeb: createGetHistoricalOrdersForWeb(dataManager),
    getLatestAccountSummarySnapshot:
      createGetLatestAccountSummarySnapshot(dataManager),
    getLatestCurrentPositionSnapshot:
      createGetLatestCurrentPositionSnapshot(dataManager),
    getLatestInstrumentPrice: createGetLatestInstrumentPrice(dataManager),
    saveManualInstrumentPrice: createSaveManualInstrumentPrice({ dataManager }),
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
