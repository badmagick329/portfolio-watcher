'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { syncInstrumentsAction } from '@/actions/sync-instruments-action';
import { syncOrdersAction } from '@/actions/sync-orders-action';
import {
  type OrdersSyncActionKind,
  type OrdersSyncActionResult,
} from '@/actions/sync-action-types';
import { syncPortfolioStateAction } from '@/actions/portfolio-state-action';

import { ordersExplorerQueryKey } from './useOrdersExplorerQuery';

const runOrdersSyncAction = (kind: OrdersSyncActionKind) => {
  if (kind === 'orders') {
    return syncOrdersAction();
  }

  if (kind === 'instruments') {
    return syncInstrumentsAction();
  }

  return syncPortfolioStateAction();
};

const getOrdersSyncMutationOptions = ({
  invalidateOrdersExplorer,
  setLastResult,
}: {
  invalidateOrdersExplorer: () => Promise<void>;
  setLastResult: (result: OrdersSyncActionResult) => void;
}) => ({
  mutationFn: runOrdersSyncAction,
  onSuccess: async (result: OrdersSyncActionResult) => {
    setLastResult(result);

    if (result.ok) {
      await invalidateOrdersExplorer();
    }
  },
});

function useOrdersSyncActions() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<OrdersSyncActionResult | null>(
    null,
  );
  const mutation = useMutation(
    getOrdersSyncMutationOptions({
      invalidateOrdersExplorer: () =>
        queryClient.invalidateQueries({ queryKey: ordersExplorerQueryKey }),
      setLastResult,
    }),
  );

  return {
    activeKind: mutation.variables ?? null,
    isPending: mutation.isPending,
    lastResult,
    sync: mutation.mutate,
  };
}

export {
  getOrdersSyncMutationOptions,
  runOrdersSyncAction,
  useOrdersSyncActions,
};
