'use client';

import { useQuery } from '@tanstack/react-query';

import { getOrdersExplorerDataAction } from '@/actions/orders-explorer-action';

const ordersExplorerQueryKey = ['orders-explorer'] as const;

const getOrdersExplorerQueryOptions = () => ({
  queryKey: ordersExplorerQueryKey,
  queryFn: getOrdersExplorerDataAction,
});

function useOrdersExplorerQuery() {
  return useQuery(getOrdersExplorerQueryOptions());
}

export { getOrdersExplorerQueryOptions, ordersExplorerQueryKey, useOrdersExplorerQuery };
