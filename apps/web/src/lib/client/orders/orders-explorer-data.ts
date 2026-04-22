import type { WebHistoricalOrder } from '@portfolio/domain';
import type { AppCapabilitiesData } from '../app-capabilities';

import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '../portfolio/instrument-price';

type OrdersExplorerData = {
  capabilities: AppCapabilitiesData;
  instruments: InstrumentWithStoredPrice[];
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
};

export type { OrdersExplorerData };
