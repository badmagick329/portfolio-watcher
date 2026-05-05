'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  clearInstrumentProviderResolutionAction,
  confirmInstrumentProviderResolutionAction,
  refreshInstrumentProviderMappingsAction,
  setInstrumentCategoriesAction,
  unsetInstrumentCategoriesAction,
} from '@/actions/instrument-categories-action';

import { instrumentCategoriesQueryRootKey } from './category-query-keys';

const getSetInstrumentCategoriesMutationOptions = ({
  invalidateInstrumentCategories,
}: {
  invalidateInstrumentCategories: () => Promise<void>;
}) => ({
  mutationFn: setInstrumentCategoriesAction,
  onSuccess: invalidateInstrumentCategories,
});

const getUnsetInstrumentCategoriesMutationOptions = ({
  invalidateInstrumentCategories,
}: {
  invalidateInstrumentCategories: () => Promise<void>;
}) => ({
  mutationFn: unsetInstrumentCategoriesAction,
  onSuccess: invalidateInstrumentCategories,
});

function useInstrumentCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidateInstrumentCategories = () =>
    queryClient.invalidateQueries({
      queryKey: instrumentCategoriesQueryRootKey,
    });

  return {
    clearRiskMapping: useMutation({
      mutationFn: clearInstrumentProviderResolutionAction,
      onSuccess: invalidateInstrumentCategories,
    }),
    confirmRiskMapping: useMutation({
      mutationFn: confirmInstrumentProviderResolutionAction,
      onSuccess: invalidateInstrumentCategories,
    }),
    refreshRiskMappings: useMutation({
      mutationFn: refreshInstrumentProviderMappingsAction,
      onSuccess: invalidateInstrumentCategories,
    }),
    setCategories: useMutation(
      getSetInstrumentCategoriesMutationOptions({
        invalidateInstrumentCategories,
      }),
    ),
    unsetCategories: useMutation(
      getUnsetInstrumentCategoriesMutationOptions({
        invalidateInstrumentCategories,
      }),
    ),
  };
}

export {
  getSetInstrumentCategoriesMutationOptions,
  getUnsetInstrumentCategoriesMutationOptions,
  useInstrumentCategoryMutations,
};
