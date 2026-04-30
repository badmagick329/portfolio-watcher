import type { BrokerDataManager } from '@portfolio/domain';

const createGetLatestCurrentPositionSnapshot = (dataManager: BrokerDataManager) =>
  (isin: string) =>
    dataManager.getLatestCurrentPortfolioPositionSnapshotByIsin(isin);

export { createGetLatestCurrentPositionSnapshot };
