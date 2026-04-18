import { formatHiddenMoney } from '@/lib/client/privacy-values';

const NA_LABEL = 'n/a';

const formatMoney = (
  value: number,
  options: { hideValues?: boolean } = {},
) =>
  options.hideValues
    ? formatHiddenMoney(value)
    : new Intl.NumberFormat('en-GB', {
        currency: 'GBP',
        maximumFractionDigits: 2,
        style: 'currency',
      }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value);

const formatBeta = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 2,
  }).format(value);

export { formatBeta, formatMoney, formatPercent, NA_LABEL };
