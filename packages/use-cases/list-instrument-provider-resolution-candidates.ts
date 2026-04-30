import type {
  BrokerDataManager,
  InstrumentRiskProvider,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const createListInstrumentProviderResolutionCandidates =
  (
    dataManager: Pick<
      BrokerDataManager,
      'listInstrumentProviderResolutionCandidates'
    >,
  ) =>
  (provider: InstrumentRiskProvider = 'fmp') => {
    if (provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    return dataManager.listInstrumentProviderResolutionCandidates(provider);
  };

export { createListInstrumentProviderResolutionCandidates };
