import type {
  AppError,
  BrokerDataManager,
  UnsetInstrumentCategoriesInput,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const createUnsetInstrumentCategories =
  (dataManager: Pick<BrokerDataManager, 'unsetInstrumentCategory'>) =>
  (input: UnsetInstrumentCategoriesInput) => {
    const isins = normalizeIsins(input.isins);

    if (isins.length === 0) {
      return errAsync(validationError('Select at least one instrument.'));
    }

    let operation: ResultAsync<void, AppError> = okAsync(undefined);

    isins.forEach((isin) => {
      operation = operation.andThen(() =>
        dataManager.unsetInstrumentCategory(isin),
      );
    });

    return operation.map(() => ({ isins }));
  };

const normalizeIsins = (isins: string[]) =>
  [...new Set(isins.map((isin) => isin.trim()).filter(Boolean))];

export { createUnsetInstrumentCategories };
