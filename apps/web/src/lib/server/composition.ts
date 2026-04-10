import 'server-only';

import { createWebServices } from '@portfolio/composition';

const webServices = createWebServices();

export const {
  getDistinctInstruments,
  getHistoricalOrdersForWeb,
  getLatestAccountSummarySnapshot,
  getLatestCurrentPositionSnapshot,
  getLatestInstrumentPrice,
  saveManualInstrumentPrice,
  syncHistoricalOrders,
  syncT212InstrumentCatalog,
  syncPortfolioState,
} =
  webServices;
