import type {
  BrokerDataManager,
  InstrumentProviderResolutionConfidence,
  InstrumentProviderResolutionMethod,
  InstrumentRiskProvider,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

type Input = {
  isin: string;
  provider?: InstrumentRiskProvider;
  providerSymbol: string;
};

const createConfirmInstrumentProviderResolution =
  (
    dataManager: Pick<
      BrokerDataManager,
      | 'setInstrumentProviderSymbol'
      | 'saveInstrumentProviderResolutionStatus'
      | 'listInstrumentProviderResolutionCandidates'
    >,
  ) =>
  (input: Input) => {
    const provider = input.provider ?? 'fmp';
    const providerSymbol = input.providerSymbol.trim();

    if (provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    if (!input.isin.trim()) {
      return errAsync(validationError('ISIN is required.'));
    }

    if (!providerSymbol) {
      return errAsync(validationError('Provider symbol is required.'));
    }

    return dataManager
      .listInstrumentProviderResolutionCandidates(provider)
      .andThen((candidates) => {
        const candidate = candidates.find(
          (item) =>
            item.isin === input.isin && item.candidateSymbol === providerSymbol,
        );

        return dataManager
          .setInstrumentProviderSymbol({
            isin: input.isin,
            provider,
            providerSymbol,
          })
          .andThen(() =>
            dataManager.saveInstrumentProviderResolutionStatus({
              isin: input.isin,
              provider,
              status: 'resolved',
              resolvedSymbol: providerSymbol,
              resolutionMethod:
                'user_confirmed' satisfies InstrumentProviderResolutionMethod,
              confidence:
                'medium' satisfies InstrumentProviderResolutionConfidence,
              message: null,
              evidence: candidate?.evidence ?? null,
              fetchedAt: candidate?.fetchedAt ?? null,
              noCandidates: false,
              lastErrorCode: null,
              lastErrorMessage: null,
            }),
          )
          .map(() => ({
            isin: input.isin,
            provider,
            providerSymbol,
          }));
      });
  };

export { createConfirmInstrumentProviderResolution };
