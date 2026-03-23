import { createBrokerDataManager } from '@portfolio/infra';
import { createGetHistoricalOrdersForWeb } from '@portfolio/use-cases';

export const createWebServices = () => {
  const dataManager = createBrokerDataManager();

  return {
    getHistoricalOrdersForWeb: createGetHistoricalOrdersForWeb(dataManager),
  };
};
