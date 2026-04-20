import type { WebHistoricalOrder } from '@portfolio/domain';
import {
  type FillDateRangeFilter,
  hasFillDateRangeFilter,
} from '../portfolio/fill-date-filter';
import type {
  AlphaAssumptions,
  CategorizedInstrumentWithPosition,
  CategoryAllocationViewModel,
} from './category-allocation-types';
import { UNCATEGORIZED_LABEL } from './category-allocation-types';
import { buildCurrentCategoryAllocationViewModel } from './current-category-allocation';
import { buildHistoricalCategoryAllocationViewModel } from './historical-category-allocation';

function buildCategoryAllocationViewModel({
  alphaAssumptions,
  fillDateRangeFilter = {},
  historicalOrders = [],
  instruments,
}: {
  alphaAssumptions?: AlphaAssumptions;
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

  return buildCurrentCategoryAllocationViewModel({
    alphaAssumptions,
    historicalOrders,
    instruments,
  });
}

export { buildCategoryAllocationViewModel, UNCATEGORIZED_LABEL };
export type {
  AlphaAssumptions,
  CategorizedInstrumentWithPosition,
  CategoryAllocationRow,
  CategoryAllocationViewModel,
} from './category-allocation-types';
