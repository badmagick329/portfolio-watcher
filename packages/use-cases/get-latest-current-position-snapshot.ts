import type { BrokerDataManager } from '@portfolio/domain';

const createGetLatestCurrentPositionSnapshot = (dataManager: BrokerDataManager) =>
  (isin: string) => dataManager.getLatestCurrentPositionSnapshotByIsin(isin);

export { createGetLatestCurrentPositionSnapshot };
