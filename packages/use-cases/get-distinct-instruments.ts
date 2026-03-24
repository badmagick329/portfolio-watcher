import type { BrokerDataManager } from '@portfolio/domain';

const createGetDistinctInstruments = (dataManager: BrokerDataManager) => () =>
  dataManager.getDistinctInstruments();

export { createGetDistinctInstruments };
