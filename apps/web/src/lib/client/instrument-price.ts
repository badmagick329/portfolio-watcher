import type {
  AccountSummarySnapshot,
  CurrentPositionSnapshot,
  InstrumentPriceSnapshot,
  InstrumentPriceType,
  WebHistoricalOrderInstrument,
} from '@portfolio/domain';

type InstrumentStoredPrice = Pick<
  InstrumentPriceSnapshot,
  'provider' | 'price' | 'currency' | 'asOf' | 'priceType'
>;

type InstrumentWithStoredPrice = WebHistoricalOrderInstrument & {
  latestStoredPrice: InstrumentStoredPrice | null;
  latestPositionSnapshot: CurrentPositionSnapshot | null;
};

type EffectiveInstrumentPrice = {
  source: 'manual' | 'stored' | 'derived_from_fill';
  provider?: InstrumentPriceSnapshot['provider'];
  value: number;
  currency: string;
  asOf?: string;
  priceType?: InstrumentPriceType;
};

export type {
  AccountSummarySnapshot,
  CurrentPositionSnapshot,
  EffectiveInstrumentPrice,
  InstrumentStoredPrice,
  InstrumentWithStoredPrice,
};
