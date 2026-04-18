import type { WebHistoricalOrder } from '@portfolio/domain';
import type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationViewModel,
} from './category-allocation-types';
import { UNCATEGORIZED_LABEL } from './category-allocation-types';
import { buildCurrentCategoryAllocationViewModel } from './current-category-allocation';
import {
  hasFillDateRangeFilter,
  type FillDateRangeFilter,
} from '../portfolio/fill-date-filter';
import { buildHistoricalCategoryAllocationViewModel } from './historical-category-allocation';

function buildCategoryAllocationViewModel({
  fillDateRangeFilter = {},
  historicalOrders = [],
  instruments,
}: {
  fillDateRangeFilter?: FillDateRangeFilter;
  historicalOrders?: WebHistoricalOrder[];
  instruments: CategorizedInstrumentWithPosition[];
}): CategoryAllocationViewModel {
  if (hasFillDateRangeFilter(fillDateRangeFilter)) {
    return buildHistoricalCategoryAllocationViewModel({
      fillDateRangeFilter,
      historicalOrders,
      instruments,
    });
  }

  return buildCurrentCategoryAllocationViewModel({ instruments });
}

export { buildCategoryAllocationViewModel, UNCATEGORIZED_LABEL };
export type {
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
} from './category-allocation-types';
