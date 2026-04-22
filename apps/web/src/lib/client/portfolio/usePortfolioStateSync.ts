'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { syncPortfolioStateAction } from '@/actions/portfolio-state-action';

import { ordersExplorerQueryKey } from '../orders/useOrdersExplorerQuery';

const PORTFOLIO_STATE_SYNC_INTERVAL_MS = 60_000;
const portfolioStateSyncQueryKey = ['portfolio-state-sync'] as const;

const getPortfolioStateSyncQueryOptions = (
  invalidateOrdersExplorer: () => Promise<void>,
  enabled = true,
) => ({
  queryKey: portfolioStateSyncQueryKey,
  queryFn: async () => {
    const result = await syncPortfolioStateAction();

    if (result.ok) {
      await invalidateOrdersExplorer();
    }

    return result;
  },
  retry: false,
  enabled,
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: 'always' as const,
  refetchInterval: PORTFOLIO_STATE_SYNC_INTERVAL_MS,
  refetchIntervalInBackground: false,
});

function usePortfolioStateSync(enabled = true) {
  const queryClient = useQueryClient();

  return useQuery(
    getPortfolioStateSyncQueryOptions(() =>
      queryClient.invalidateQueries({ queryKey: ordersExplorerQueryKey }),
      enabled,
    ),
  );
}

export {
  getPortfolioStateSyncQueryOptions,
  PORTFOLIO_STATE_SYNC_INTERVAL_MS,
  portfolioStateSyncQueryKey,
  usePortfolioStateSync,
};
