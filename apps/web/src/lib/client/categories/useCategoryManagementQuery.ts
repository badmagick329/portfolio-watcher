'use client';

import { getCategoryManagementAction } from '@/actions/instrument-categories-action';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { categoryManagementQueryKey } from './category-query-keys';

const getCategoryManagementQueryOptions = () =>
  queryOptions({
    queryKey: categoryManagementQueryKey,
    queryFn: getCategoryManagementAction,
  });

function useCategoryManagementQuery() {
  return useQuery(getCategoryManagementQueryOptions());
}

export {
  getCategoryManagementQueryOptions,
  useCategoryManagementQuery,
};
