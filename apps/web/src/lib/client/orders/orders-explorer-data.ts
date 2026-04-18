import type { WebHistoricalOrder } from '@portfolio/domain';

import type {
  AccountSummarySnapshot,
  InstrumentWithStoredPrice,
} from '../portfolio/instrument-price';

type OrdersExplorerData = {
  instruments: InstrumentWithStoredPrice[];
  latestAccountSummarySnapshot: AccountSummarySnapshot | null;
  orders: WebHistoricalOrder[];
};

export type { OrdersExplorerData };
