const CATEGORY_CHART_THEME = {
  allocationColors: [
    'var(--chart-category-1)',
    'var(--chart-category-2)',
    'var(--chart-category-3)',
    'var(--chart-category-4)',
    'var(--chart-category-5)',
    'var(--chart-category-6)',
    'var(--chart-category-7)',
    'var(--chart-category-8)',
  ],
  labelBackground: 'var(--chart-label-bg)',
  labelForeground: 'var(--chart-label-fg)',
  negativeReturn: 'var(--chart-negative)',
  netInvestedAddition: 'var(--chart-net-invested-addition)',
  netInvestedWithdrawal: 'var(--chart-withdrawal)',
  positiveReturn: 'var(--chart-positive)',
} as const;

export { CATEGORY_CHART_THEME };
