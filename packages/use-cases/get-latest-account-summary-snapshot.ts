import type { BrokerDataManager } from '@portfolio/domain';

const createGetLatestAccountSummarySnapshot = (dataManager: BrokerDataManager) =>
  () => dataManager.getLatestAccountSummarySnapshot();

export { createGetLatestAccountSummarySnapshot };
