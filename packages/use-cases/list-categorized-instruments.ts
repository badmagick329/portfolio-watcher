import type {
  BrokerDataManager,
  InstrumentCategoryFilter,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import {
  normalizeCategories,
  validationError,
} from './instrument-category-helpers';

const createListCategorizedInstruments =
  (dataManager: Pick<BrokerDataManager, 'listCategorizedInstruments'>) =>
  (filters: InstrumentCategoryFilter = {}) => {
    const includeCategories = normalizeCategories(filters.includeCategories);
    const excludeCategories = normalizeCategories(filters.excludeCategories);
    const excluded = new Set(excludeCategories);
    const overlap = includeCategories.find((category) => excluded.has(category));

    if (overlap) {
      return errAsync(
        validationError(
          `Category "${overlap}" cannot be both included and excluded.`,
        ),
      );
    }

    return dataManager.listCategorizedInstruments({
      includeCategories,
      excludeCategories,
    });
  };

export { createListCategorizedInstruments };
