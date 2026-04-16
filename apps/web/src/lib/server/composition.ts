import 'server-only';

import { createWebServices } from '@portfolio/composition';

const webServices = createWebServices();

export const {
  getDistinctInstruments,
  getHistoricalOrdersForWeb,
  getLatestAccountSummarySnapshot,
  getLatestCurrentPositionSnapshot,
  getLatestInstrumentPrice,
  listCategorizedInstruments,
  saveManualInstrumentPrice,
  setInstrumentCategories,
  syncHistoricalOrders,
  syncT212InstrumentCatalog,
  syncPortfolioState,
  unsetInstrumentCategories,
} =
  webServices;
