import type {
  BrokerDataManager,
  InstrumentRiskProvider,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const createListInstrumentProviderResolutionStatuses =
  (
    dataManager: Pick<
      BrokerDataManager,
      'listInstrumentProviderResolutionStatuses'
    >,
  ) =>
  (provider: InstrumentRiskProvider = 'fmp') => {
    if (provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    return dataManager.listInstrumentProviderResolutionStatuses(provider);
  };

export { createListInstrumentProviderResolutionStatuses };
