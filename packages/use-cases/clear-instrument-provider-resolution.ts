import type { BrokerDataManager, InstrumentRiskProvider } from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

type Input = {
  isin: string;
  provider?: InstrumentRiskProvider;
};

const createClearInstrumentProviderResolution =
  (
    dataManager: Pick<
      BrokerDataManager,
      | 'unsetInstrumentProviderSymbol'
      | 'saveInstrumentProviderResolutionStatus'
    >,
  ) =>
  (input: Input) => {
    const provider = input.provider ?? 'fmp';

    if (provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    if (!input.isin.trim()) {
      return errAsync(validationError('ISIN is required.'));
    }

    return dataManager
      .unsetInstrumentProviderSymbol(input.isin, provider)
      .andThen(() =>
        dataManager.saveInstrumentProviderResolutionStatus({
          isin: input.isin,
          provider,
          status: 'unresolved',
          resolvedSymbol: null,
          resolutionMethod: null,
          confidence: null,
          message: 'Mapping cleared.',
          evidence: null,
          fetchedAt: null,
          noCandidates: false,
          lastErrorCode: null,
          lastErrorMessage: null,
        }),
      )
      .map(() => ({
        isin: input.isin,
        provider,
      }));
  };

export { createClearInstrumentProviderResolution };
