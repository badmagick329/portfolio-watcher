import type {
  BrokerDataManager,
  InstrumentProviderSymbol,
  InstrumentRiskProvider,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { resolveLocalInstrument, validationError } from './instrument-category-helpers';

type Input = {
  instrument: string;
  provider: InstrumentRiskProvider;
  symbol: string;
};

const createSetInstrumentProviderSymbol =
  (
    dataManager: Pick<
      BrokerDataManager,
      'findInstrumentCategoryInstrumentMatches' | 'setInstrumentProviderSymbol'
    >,
  ) =>
  (input: Input) => {
    if (input.provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    const providerSymbol = input.symbol.trim();

    if (!providerSymbol) {
      return errAsync(validationError('The --symbol flag is required.'));
    }

    return resolveLocalInstrument(
      input.instrument,
      dataManager.findInstrumentCategoryInstrumentMatches,
    ).andThen((instrument) =>
      dataManager
        .setInstrumentProviderSymbol({
          isin: instrument.isin,
          provider: input.provider,
          providerSymbol,
        })
        .map(
          (): Pick<
            InstrumentProviderSymbol,
            'isin' | 'provider' | 'providerSymbol'
          > & { instrument: typeof instrument } => ({
            instrument,
            isin: instrument.isin,
            provider: input.provider,
            providerSymbol,
          }),
        ),
    );
  };

export { createSetInstrumentProviderSymbol };
