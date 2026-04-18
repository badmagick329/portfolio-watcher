'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveManualInstrumentPriceAction } from '@/actions/instrument-prices-action';

import { ordersExplorerQueryKey } from '../orders/useOrdersExplorerQuery';

function useSaveManualInstrumentPriceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveManualInstrumentPriceAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ordersExplorerQueryKey });
    },
  });
}

export { useSaveManualInstrumentPriceMutation };
