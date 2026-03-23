import type {
  BrokerDataManager,
  WebHistoricalOrdersFilters,
} from '@portfolio/domain';

const createGetHistoricalOrdersForWeb = (dataManager: BrokerDataManager) =>
  (filters: WebHistoricalOrdersFilters = {}) =>
    dataManager.getHistoricalOrdersForWeb(filters);

export { createGetHistoricalOrdersForWeb };
