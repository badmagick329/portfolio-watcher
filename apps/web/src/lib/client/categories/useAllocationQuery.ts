'use client';

import { getAllocationAction } from '@/actions/instrument-categories-action';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { allocationQueryKey } from './category-query-keys';

const getAllocationQueryOptions = () =>
  queryOptions({
    queryKey: allocationQueryKey,
    queryFn: getAllocationAction,
  });

function useAllocationQuery() {
  return useQuery(getAllocationQueryOptions());
}

export { getAllocationQueryOptions, useAllocationQuery };
