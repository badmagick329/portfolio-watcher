import type {
  BrokerDataManager,
  InstrumentRiskProvider,
} from '@portfolio/domain';

const createGetLatestInstrumentRiskMetric =
  (
    dataManager: Pick<
      BrokerDataManager,
      'getLatestInstrumentRiskMetricByIsin'
    >,
  ) =>
  (isin: string, provider: InstrumentRiskProvider = 'fmp') =>
    dataManager.getLatestInstrumentRiskMetricByIsin(isin, provider);

export { createGetLatestInstrumentRiskMetric };
