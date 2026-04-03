import { createBrokerDataManager, createTrading212Client } from '@portfolio/infra';
import {
  createGetDistinctInstruments,
  createGetLatestAccountSummarySnapshot,
  createGetLatestCurrentPositionSnapshot,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
  createSaveManualInstrumentPrice,
  createSyncCurrentPositionPricesFromT212,
} from '@portfolio/use-cases';

export const createWebServices = () => {
  const client = createTrading212Client();
  const dataManager = createBrokerDataManager();

  return {
    getDistinctInstruments: createGetDistinctInstruments(dataManager),
    getHistoricalOrdersForWeb: createGetHistoricalOrdersForWeb(dataManager),
    getLatestAccountSummarySnapshot:
      createGetLatestAccountSummarySnapshot(dataManager),
    getLatestCurrentPositionSnapshot:
      createGetLatestCurrentPositionSnapshot(dataManager),
    getLatestInstrumentPrice: createGetLatestInstrumentPrice(dataManager),
    saveManualInstrumentPrice: createSaveManualInstrumentPrice({ dataManager }),
    syncPortfolioState: createSyncCurrentPositionPricesFromT212({
      client,
      dataManager,
    }),
  };
};
