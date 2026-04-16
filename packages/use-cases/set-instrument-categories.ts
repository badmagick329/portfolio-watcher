import type {
  BrokerDataManager,
  SetInstrumentCategoriesInput,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import { normalizeCategory, validationError } from './instrument-category-helpers';

const createSetInstrumentCategories =
  (dataManager: Pick<BrokerDataManager, 'setInstrumentCategories'>) =>
  (input: SetInstrumentCategoriesInput) => {
    const isins = normalizeIsins(input.isins);
    const category = normalizeCategory(input.category);

    if (isins.length === 0) {
      return errAsync(validationError('Select at least one instrument.'));
    }

    if (category.length === 0) {
      return errAsync(validationError('Category is required.'));
    }

    return dataManager
      .setInstrumentCategories(isins, category)
      .map(() => ({ isins, category }));
  };

const normalizeIsins = (isins: string[]) =>
  [...new Set(isins.map((isin) => isin.trim()).filter(Boolean))];

export { createSetInstrumentCategories };
