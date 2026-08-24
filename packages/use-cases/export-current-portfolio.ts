import type {
  AppError,
  BrokerDataManager,
  PortfolioExport,
  PortfolioStateSyncResult,
} from '@portfolio/domain';
import { type ResultAsync, errAsync, okAsync } from 'neverthrow';

type Params = {
  syncInstrumentCatalog: () => ResultAsync<number, AppError>;
  syncPortfolioState: () => ResultAsync<PortfolioStateSyncResult, AppError>;
  dataManager: Pick<BrokerDataManager, 'getLatestCurrentPortfolioSnapshot'>;
};

const createExportCurrentPortfolio =
  ({ syncInstrumentCatalog, syncPortfolioState, dataManager }: Params) =>
  (): ResultAsync<PortfolioExport, AppError> =>
    syncInstrumentCatalog()
      .andThen(() => syncPortfolioState())
      .andThen(() => dataManager.getLatestCurrentPortfolioSnapshot())
      .andThen((snapshot) => {
        if (!snapshot) {
          return errAsync<PortfolioExport, AppError>({
            code: 'VALIDATION',
            message:
              'No current portfolio snapshot is available after refresh.',
          });
        }

        const { accountSummary } = snapshot;
        const holdings = snapshot.holdings.map(
          ({ ticker, name, isin, instrumentType, category, position }) => ({
            name,
            instrumentType,
            isin,
            trading212Ticker: ticker,
            category,
            quantity: position.quantity,
            averageUnitCost: position.averagePricePaid ?? null,
            currentUnitPrice: position.currentPrice,
            priceCurrency: position.instrumentCurrency,
            totalCost: position.totalCost,
            currentValue: position.currentValue,
            unrealizedProfitLoss: position.unrealizedProfitLoss,
            valueCurrency: position.walletCurrency,
            portfolioWeightPercent:
              accountSummary.currentValue === 0
                ? 0
                : (position.currentValue / accountSummary.currentValue) * 100,
          }),
        );

        return okAsync({
          asOf: accountSummary.asOf,
          accountCurrency: accountSummary.currency,
          summary: {
            holdingsValue: accountSummary.currentValue,
            holdingsCost: accountSummary.totalCost,
            realizedProfitLoss: accountSummary.realizedProfitLoss,
            unrealizedProfitLoss: accountSummary.unrealizedProfitLoss,
            totalAccountValue: accountSummary.totalValue,
          },
          holdings,
        } satisfies PortfolioExport);
      });

export { createExportCurrentPortfolio };
