import type {
  BrokerDataManager,
  SetInstrumentCategoryInput,
} from '@portfolio/domain';
import { errAsync } from 'neverthrow';
import {
  normalizeCategory,
  resolveLocalInstrument,
  validationError,
} from './instrument-category-helpers';

const createSetInstrumentCategory =
  (
    dataManager: Pick<
      BrokerDataManager,
      'findInstrumentCategoryInstrumentMatches' | 'setInstrumentCategory'
    >,
  ) =>
  (input: SetInstrumentCategoryInput) => {
    const category = normalizeCategory(input.category);

    if (category.length === 0) {
      return errAsync(validationError('The --category flag is required.'));
    }

    return resolveLocalInstrument(
      input.instrument,
      dataManager.findInstrumentCategoryInstrumentMatches,
    ).andThen((instrument) =>
      dataManager
        .setInstrumentCategory(instrument.isin, category)
        .map(() => ({ instrument, category })),
    );
  };

export { createSetInstrumentCategory };
