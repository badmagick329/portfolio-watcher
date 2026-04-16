import type {
  BrokerDataManager,
  UnsetInstrumentCategoryInput,
} from '@portfolio/domain';
import { resolveLocalInstrument } from './instrument-category-helpers';

const createUnsetInstrumentCategory =
  (
    dataManager: Pick<
      BrokerDataManager,
      'findInstrumentCategoryInstrumentMatches' | 'unsetInstrumentCategory'
    >,
  ) =>
  (input: UnsetInstrumentCategoryInput) =>
    resolveLocalInstrument(
      input.instrument,
      dataManager.findInstrumentCategoryInstrumentMatches,
    ).andThen((instrument) =>
      dataManager.unsetInstrumentCategory(instrument.isin).map(() => ({
        instrument,
      })),
    );

export { createUnsetInstrumentCategory };
