import type {
  BrokerDataManager,
  UnsetInstrumentCategoriesInput,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const createUnsetInstrumentCategories =
  (dataManager: Pick<BrokerDataManager, 'unsetInstrumentCategories'>) =>
  (input: UnsetInstrumentCategoriesInput) => {
    const isins = normalizeIsins(input.isins);

    if (isins.length === 0) {
      return errAsync(validationError('Select at least one instrument.'));
    }

    return dataManager.unsetInstrumentCategories(isins).map(() => ({ isins }));
  };

const normalizeIsins = (isins: string[]) =>
  [...new Set(isins.map((isin) => isin.trim()).filter(Boolean))];

export { createUnsetInstrumentCategories };
