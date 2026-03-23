import 'server-only';

import { createWebServices } from '@portfolio/composition';

const webServices = createWebServices();

export const { getHistoricalOrdersForWeb } = webServices;
