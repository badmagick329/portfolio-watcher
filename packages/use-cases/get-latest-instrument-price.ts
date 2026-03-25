import type { BrokerDataManager } from '@portfolio/domain';

const createGetLatestInstrumentPrice = (dataManager: BrokerDataManager) =>
  (isin: string) => dataManager.getLatestInstrumentPriceByIsin(isin);

export { createGetLatestInstrumentPrice };
