import { beforeEach, describe, expect, it, vi } from 'vitest';

const setInstrumentCategoriesActionMock = vi.fn();
const unsetInstrumentCategoriesActionMock = vi.fn();

vi.mock('@/actions/instrument-categories-action', () => ({
  setInstrumentCategoriesAction: setInstrumentCategoriesActionMock,
  unsetInstrumentCategoriesAction: unsetInstrumentCategoriesActionMock,
}));

describe('instrument category mutation options', () => {
  beforeEach(() => {
    setInstrumentCategoriesActionMock.mockReset();
    unsetInstrumentCategoriesActionMock.mockReset();
  });

  it('invalidates category query after setting categories', async () => {
    const invalidateInstrumentCategories = vi.fn().mockResolvedValue(undefined);
    const result = { isins: ['US0378331005'], category: 'growth' };
    const { getSetInstrumentCategoriesMutationOptions } = await import(
      '@/lib/client/categories/useInstrumentCategoryMutations'
    );
    setInstrumentCategoriesActionMock.mockResolvedValue(result);

    const options = getSetInstrumentCategoriesMutationOptions({
      invalidateInstrumentCategories,
    });

    await expect(
      options.mutationFn({ isins: ['US0378331005'], category: 'growth' }),
    ).resolves.toEqual(result);
    await options.onSuccess();

    expect(invalidateInstrumentCategories).toHaveBeenCalledTimes(1);
  });

  it('invalidates category query after unsetting categories', async () => {
    const invalidateInstrumentCategories = vi.fn().mockResolvedValue(undefined);
    const result = { isins: ['US0378331005'] };
    const { getUnsetInstrumentCategoriesMutationOptions } = await import(
      '@/lib/client/categories/useInstrumentCategoryMutations'
    );
    unsetInstrumentCategoriesActionMock.mockResolvedValue(result);

    const options = getUnsetInstrumentCategoriesMutationOptions({
      invalidateInstrumentCategories,
    });

    await expect(
      options.mutationFn({ isins: ['US0378331005'] }),
    ).resolves.toEqual(result);
    await options.onSuccess();

    expect(invalidateInstrumentCategories).toHaveBeenCalledTimes(1);
  });
});
