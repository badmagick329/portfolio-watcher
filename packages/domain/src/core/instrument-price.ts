import type { ResultAsync } from 'neverthrow';
import type {
  AppError,
  InstrumentPriceFetchResult,
  InstrumentPriceProvider,
  InstrumentPriceRefreshCandidate,
  InstrumentPriceResolution,
  InstrumentPriceSnapshot,
  InstrumentPriceSource,
  InstrumentPriceSyncResult,
  WebHistoricalOrderInstrument,
} from '../types';

type ResolveInstrumentPriceByIsinInput = Pick<
  WebHistoricalOrderInstrument,
  'isin' | 'name' | 'currency'
>;

interface InstrumentPriceClient {
  readonly provider: InstrumentPriceProvider;
  resolveByIsin: (
    input: ResolveInstrumentPriceByIsinInput,
  ) => ResultAsync<InstrumentPriceResolution | null, AppError>;
  fetchLatestPrice: (
    source: InstrumentPriceSource | InstrumentPriceResolution,
  ) => ResultAsync<InstrumentPriceFetchResult, AppError>;
}

interface InstrumentPriceDataManager {
  saveInstrumentPriceSource: (
    source: InstrumentPriceSource,
  ) => ResultAsync<void, AppError>;
  getInstrumentPriceSourceByIsin: (
    isin: string,
  ) => ResultAsync<InstrumentPriceSource | undefined, AppError>;
  saveInstrumentPriceSnapshot: (
    snapshot: InstrumentPriceSnapshot,
  ) => ResultAsync<void, AppError>;
  getLatestInstrumentPriceByIsin: (
    isin: string,
  ) => ResultAsync<InstrumentPriceSnapshot | undefined, AppError>;
  listInstrumentsNeedingPriceRefresh: (params: {
    fetchedBefore: string;
    failedAfter: string;
  }) => ResultAsync<InstrumentPriceRefreshCandidate[], AppError>;
}

type InstrumentPriceServices = {
  dataManager: InstrumentPriceDataManager;
  clients: InstrumentPriceClient[];
};

export type {
  InstrumentPriceClient,
  InstrumentPriceDataManager,
  InstrumentPriceServices,
  ResolveInstrumentPriceByIsinInput,
};
