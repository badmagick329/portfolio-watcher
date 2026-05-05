'use client';

import { getRiskMappingsAction } from '@/actions/instrument-categories-action';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { riskMappingsQueryKey } from './category-query-keys';

const getRiskMappingsQueryOptions = () =>
  queryOptions({
    queryKey: riskMappingsQueryKey,
    queryFn: getRiskMappingsAction,
  });

function useRiskMappingsQuery() {
  return useQuery(getRiskMappingsQueryOptions());
}

export { getRiskMappingsQueryOptions, useRiskMappingsQuery };
