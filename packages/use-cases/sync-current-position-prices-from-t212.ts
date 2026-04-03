import type {
  AccountSummary,
  AccountSummarySnapshot,
  AppError,
  BrokerClient,
  BrokerDataManager,
  CurrentPositionSnapshot,
  InstrumentPriceSnapshot,
  Position,
  Positions,
  PortfolioStateSyncResult,
} from '@portfolio/domain';
import { ResultAsync, okAsync } from 'neverthrow';

type Params = {
  client: Pick<BrokerClient, 'fetchPositions' | 'fetchAccountSummary'>;
  dataManager: Pick<
    BrokerDataManager,
    | 'saveInstrumentPriceSnapshot'
    | 'saveCurrentPositionSnapshot'
    | 'saveAccountSummarySnapshot'
  >;
  now?: () => Date;
};

const createSyncCurrentPositionPricesFromT212 = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => {
  const syncCurrentPositionPricesFromT212 =
    (): ResultAsync<PortfolioStateSyncResult, AppError> => {
      const fetchedAt = now().toISOString();

      return client.fetchAccountSummary().andThen((accountSummary) =>
        client.fetchPositions().andThen((positions) =>
          persistPortfolioState({
            accountSummary,
            positions,
            fetchedAt,
            dataManager,
          }).map((persisted) => ({
            attemptedPositions: positions.length,
            persistedPrices: persisted.prices,
            persistedPositions: persisted.positions,
            persistedAccountSummaries: persisted.accountSummaries,
          })),
        ),
      );
    };

  return syncCurrentPositionPricesFromT212;
};

const persistPortfolioState = ({
  accountSummary,
  positions,
  fetchedAt,
  dataManager,
}: {
  accountSummary: AccountSummary;
  positions: Positions;
  fetchedAt: string;
  dataManager: Pick<
    BrokerDataManager,
    | 'saveInstrumentPriceSnapshot'
    | 'saveCurrentPositionSnapshot'
    | 'saveAccountSummarySnapshot'
  >;
}): ResultAsync<
  {
    prices: number;
    positions: number;
    accountSummaries: number;
  },
  AppError
> =>
  persistInstrumentPriceSnapshots({
    snapshots: positions.map((position) =>
      toInstrumentPriceSnapshot({
        isin: position.instrument.isin,
        providerSymbol: position.instrument.ticker,
        currency: position.instrument.currencyCode,
        price: position.currentPrice,
        fetchedAt,
      }),
    ),
    dataManager,
  }).andThen((persistedPrices) =>
    persistCurrentPositionSnapshots({
      snapshots: positions
        .map((position) =>
          toCurrentPositionSnapshot({
            position,
            walletCurrency: accountSummary.currency,
            fetchedAt,
          }),
        )
        .filter((snapshot): snapshot is CurrentPositionSnapshot => snapshot !== null),
      dataManager,
    }).andThen((persistedPositions) =>
      dataManager
        .saveAccountSummarySnapshot(
          toAccountSummarySnapshot({
            accountSummary,
            fetchedAt,
          }),
        )
        .map(() => ({
          prices: persistedPrices,
          positions: persistedPositions,
          accountSummaries: 1,
        })),
    ),
  );

const persistInstrumentPriceSnapshots = ({
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
    persistInstrumentPriceSnapshots({
      snapshots: rest,
      dataManager,
      persisted: persisted + 1,
    }),
  );
};

const persistCurrentPositionSnapshots = ({
  snapshots,
  dataManager,
  persisted = 0,
}: {
  snapshots: CurrentPositionSnapshot[];
  dataManager: Pick<BrokerDataManager, 'saveCurrentPositionSnapshot'>;
  persisted?: number;
}): ResultAsync<number, AppError> => {
  const [snapshot, ...rest] = snapshots;

  if (!snapshot) {
    return okAsync(persisted);
  }

  return dataManager.saveCurrentPositionSnapshot(snapshot).andThen(() =>
    persistCurrentPositionSnapshots({
      snapshots: rest,
      dataManager,
      persisted: persisted + 1,
    }),
  );
};

const toInstrumentPriceSnapshot = ({
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

const toCurrentPositionSnapshot = ({
  position,
  walletCurrency,
  fetchedAt,
}: {
  position: Position;
  walletCurrency: string;
  fetchedAt: string;
}): CurrentPositionSnapshot | null => {
  if (!position.quantity || !position.walletImpact) {
    return null;
  }

  return {
    isin: position.instrument.isin,
    providerSymbol: position.instrument.ticker,
    quantity: position.quantity,
    currentPrice: position.currentPrice,
    instrumentCurrency: position.instrument.currencyCode,
    walletCurrency: position.walletImpact.currency || walletCurrency,
    currentValue: position.walletImpact.currentValue,
    totalCost: position.walletImpact.totalCost,
    unrealizedProfitLoss: position.walletImpact.unrealizedProfitLoss,
    fxImpact: position.walletImpact.fxImpact ?? null,
    asOf: fetchedAt,
    fetchedAt,
  };
};

const toAccountSummarySnapshot = ({
  accountSummary,
  fetchedAt,
}: {
  accountSummary: AccountSummary;
  fetchedAt: string;
}): AccountSummarySnapshot => ({
  currency: accountSummary.currency,
  currentValue: accountSummary.investments.currentValue,
  totalCost: accountSummary.investments.totalCost,
  realizedProfitLoss: accountSummary.investments.realizedProfitLoss,
  unrealizedProfitLoss: accountSummary.investments.unrealizedProfitLoss,
  totalValue: accountSummary.totalValue,
  asOf: fetchedAt,
  fetchedAt,
});

export { createSyncCurrentPositionPricesFromT212 };
