import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  CurrentPositionPriceSyncResult,
  InstrumentPriceSnapshot,
} from '@portfolio/domain';
import { ResultAsync, okAsync } from 'neverthrow';

type Params = {
  client: Pick<BrokerClient, 'fetchPositions'>;
  dataManager: Pick<BrokerDataManager, 'saveInstrumentPriceSnapshot'>;
  now?: () => Date;
};

const createSyncCurrentPositionPricesFromT212 = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => {
  const syncCurrentPositionPricesFromT212 =
    (): ResultAsync<CurrentPositionPriceSyncResult, AppError> => {
      const fetchedAt = now().toISOString();

      return client.fetchPositions().andThen((positions) =>
        persistSnapshots({
          snapshots: positions.map((position) =>
            toSnapshot({
              isin: position.instrument.isin,
              providerSymbol: position.instrument.ticker,
              currency: position.instrument.currencyCode,
              price: position.currentPrice,
              fetchedAt,
            }),
          ),
          dataManager,
        }).map((persisted) => ({
          attempted: positions.length,
          persisted,
        })),
      );
    };

  return syncCurrentPositionPricesFromT212;
};

const persistSnapshots = ({
  snapshots,
  dataManager,
  persisted = 0,
}: {
  snapshots: InstrumentPriceSnapshot[];
  dataManager: Pick<BrokerDataManager, 'saveInstrumentPriceSnapshot'>;
  persisted?: number;
}): ResultAsync<number, AppError> => {
  const [snapshot, ...rest] = snapshots;

  if (!snapshot) {
    return okAsync(persisted);
  }

  return dataManager.saveInstrumentPriceSnapshot(snapshot).andThen(() =>
    persistSnapshots({
      snapshots: rest,
      dataManager,
      persisted: persisted + 1,
    }),
  );
};

const toSnapshot = ({
  isin,
  providerSymbol,
  currency,
  price,
  fetchedAt,
}: {
  isin: string;
  providerSymbol: string;
  currency: string;
  price: number;
  fetchedAt: string;
}): InstrumentPriceSnapshot => ({
  isin,
  provider: 't212',
  providerSymbol,
  currency,
  price,
  priceType: 'position_current',
  asOf: fetchedAt,
  fetchedAt,
});

export { createSyncCurrentPositionPricesFromT212 };
