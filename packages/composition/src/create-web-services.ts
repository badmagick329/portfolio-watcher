import { createBrokerDataManager } from '@portfolio/infra';
import {
  createGetDistinctInstruments,
  createGetHistoricalOrdersForWeb,
  createGetLatestInstrumentPrice,
} from '@portfolio/use-cases';

export const createWebServices = () => {
  const dataManager = createBrokerDataManager();

  return {
    getDistinctInstruments: createGetDistinctInstruments(dataManager),
    getHistoricalOrdersForWeb: createGetHistoricalOrdersForWeb(dataManager),
    getLatestInstrumentPrice: createGetLatestInstrumentPrice(dataManager),
  };
};
