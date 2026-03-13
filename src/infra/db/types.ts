import type {
  NewFill,
  NewFillTaxes,
  NewInstrument,
  NewOrder,
} from '@/infra/db/schema';

type HistoricalOrderRow = {
  orderId: number;
  strategy: string;
  type: string;
  ticker: string;
  quantity: number | null;
  filledQuantity: number | null;
  value: number | null;
  filledValue: number | null;
  limitPrice: number | null;
  status: string;
  currency: string;
  extendedHours: boolean;
  initiatedFrom: string;
  side: string;
  createdAt: string;

  instrumentTicker: string;
  instrumentName: string;
  instrumentIsin: string;
  instrumentCurrency: string;

  fillId: number | null;
  fillQuantity: number | null;
  fillPrice: number | null;
  fillType: string | null;
  fillTradingMethod: string | null;
  fillFilledAt: string | null;
  fillWalletCurrency: string | null;
  fillWalletNetValue: number | null;
  fillWalletFxRate: number | null;
};

type FillTaxRow = {
  fillId: number;
  name: string;
  quantity: number;
  currency: string;
  chargedAt: string;
};

type HistoricalOrderWriteSet = {
  instrument: NewInstrument;
  order: NewOrder;
  fill?: NewFill;
  fillTaxes: NewFillTaxes[];
};

export type { FillTaxRow, HistoricalOrderRow, HistoricalOrderWriteSet };
