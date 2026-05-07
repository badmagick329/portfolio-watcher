import { getMoversAction } from '@/actions/movers-action';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const getMoversQueryOptions = (params: {
  filledFrom?: string;
  filledTo?: string;
}) => ({
  queryKey: ['movers', params],
  queryFn: () => getMoversAction(params),
  placeholderData: keepPreviousData,
});

function useMoversQuery(params: { filledFrom?: string; filledTo?: string }) {
  return useQuery(getMoversQueryOptions(params));
}

export { getMoversQueryOptions, useMoversQuery };
