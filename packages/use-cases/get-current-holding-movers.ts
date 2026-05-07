import type { BrokerDataManager, CurrentHoldingMoversInput } from '@portfolio/domain';

const createGetCurrentHoldingMovers =
  (dataManager: BrokerDataManager) => (input?: CurrentHoldingMoversInput) =>
    dataManager.getCurrentHoldingMovers(input);

export { createGetCurrentHoldingMovers };
