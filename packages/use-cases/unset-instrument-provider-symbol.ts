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
      'findInstrumentCategoryInstrumentMatches' | 'unsetInstrumentProviderSymbol'
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
        .map(() => ({
          instrument,
          provider: input.provider,
        })),
    );
  };

export { createUnsetInstrumentProviderSymbol };
