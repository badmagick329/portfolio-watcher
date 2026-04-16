'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { getInstrumentCategoriesAction } from '@/actions/instrument-categories-action';

const instrumentCategoriesQueryKey = ['instrument-categories'] as const;

const getInstrumentCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: instrumentCategoriesQueryKey,
    queryFn: getInstrumentCategoriesAction,
  });

function useInstrumentCategoriesQuery() {
  return useQuery(getInstrumentCategoriesQueryOptions());
}

export {
  getInstrumentCategoriesQueryOptions,
  instrumentCategoriesQueryKey,
  useInstrumentCategoriesQuery,
};
