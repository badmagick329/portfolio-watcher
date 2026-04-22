import 'server-only';

import { createWebServices } from '@portfolio/composition';

const webServices = createWebServices();

export const {
  getAppCapabilities,
  getDistinctInstruments,
  getHistoricalOrdersForWeb,
  getLatestAccountSummarySnapshot,
  getLatestCurrentPositionSnapshot,
  getLatestInstrumentPrice,
  getLatestInstrumentRiskMetric,
  listCategorizedInstruments,
  saveManualInstrumentPrice,
  setInstrumentCategories,
  syncHistoricalOrders,
  syncT212InstrumentCatalog,
  syncPortfolioState,
  unsetInstrumentCategories,
} =
  webServices;
