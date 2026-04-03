import { createBrokerDataManager } from '@portfolio/infra';
import {
  createGetDistinctInstruments,
  createGetLatestAccountSummarySnapshot,
  createGetLatestCurrentPositionSnapshot,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
  createSaveManualInstrumentPrice,
} from '@portfolio/use-cases';

export const createWebServices = () => {
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
  };
};
