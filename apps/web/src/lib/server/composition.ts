import 'server-only';

import { createWebServices } from '@portfolio/composition';

const webServices = createWebServices();

export const { getDistinctInstruments, getHistoricalOrdersForWeb, getLatestInstrumentPrice } =
  webServices;
