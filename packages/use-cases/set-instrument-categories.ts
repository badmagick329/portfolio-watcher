import type {
  AppError,
  BrokerDataManager,
  SetInstrumentCategoriesInput,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { normalizeCategory, validationError } from './instrument-category-helpers';

const createSetInstrumentCategories =
  (dataManager: Pick<BrokerDataManager, 'setInstrumentCategory'>) =>
  (input: SetInstrumentCategoriesInput) => {
    const isins = normalizeIsins(input.isins);
    const category = normalizeCategory(input.category);

    if (isins.length === 0) {
      return errAsync(validationError('Select at least one instrument.'));
    }

    if (category.length === 0) {
      return errAsync(validationError('Category is required.'));
    }

    let operation: ResultAsync<void, AppError> = okAsync(undefined);

    isins.forEach((isin) => {
      operation = operation.andThen(() =>
        dataManager.setInstrumentCategory(isin, category),
      );
    });

    return operation.map(() => ({ isins, category }));
  };

const normalizeIsins = (isins: string[]) =>
  [...new Set(isins.map((isin) => isin.trim()).filter(Boolean))];

export { createSetInstrumentCategories };
