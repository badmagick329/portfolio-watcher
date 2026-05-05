const instrumentCategoriesQueryRootKey = ['instrument-categories'] as const;

const categoryManagementQueryKey = [
  ...instrumentCategoriesQueryRootKey,
  'management',
] as const;

const allocationQueryKey = [
  ...instrumentCategoriesQueryRootKey,
  'allocation',
] as const;

const riskMappingsQueryKey = [
  ...instrumentCategoriesQueryRootKey,
  'risk-mappings',
] as const;

export {
  allocationQueryKey,
  categoryManagementQueryKey,
  instrumentCategoriesQueryRootKey,
  riskMappingsQueryKey,
};
