'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  setInstrumentCategoriesAction,
  unsetInstrumentCategoriesAction,
} from '@/actions/instrument-categories-action';

import { instrumentCategoriesQueryKey } from './useInstrumentCategoriesQuery';

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
    queryClient.invalidateQueries({ queryKey: instrumentCategoriesQueryKey });

  return {
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
