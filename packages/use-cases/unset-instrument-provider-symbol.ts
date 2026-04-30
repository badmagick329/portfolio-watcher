import type {
  BrokerDataManager,
  InstrumentRiskProvider,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { resolveLocalInstrument, validationError } from './instrument-category-helpers';

type Input = {
  instrument: string;
  provider: InstrumentRiskProvider;
};

const createUnsetInstrumentProviderSymbol =
  (
    dataManager: Pick<
      BrokerDataManager,
      | 'findInstrumentCategoryInstrumentMatches'
      | 'unsetInstrumentProviderSymbol'
      | 'saveInstrumentProviderResolutionStatus'
    >,
  ) =>
  (input: Input) => {
    if (input.provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    return resolveLocalInstrument(
      input.instrument,
      dataManager.findInstrumentCategoryInstrumentMatches,
    ).andThen((instrument) =>
      dataManager
        .unsetInstrumentProviderSymbol(instrument.isin, input.provider)
        .andThen(() =>
          dataManager.saveInstrumentProviderResolutionStatus({
            isin: instrument.isin,
            provider: input.provider,
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
          instrument,
          provider: input.provider,
        })),
    );
  };

export { createUnsetInstrumentProviderSymbol };
