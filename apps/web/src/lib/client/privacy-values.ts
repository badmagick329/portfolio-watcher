const HIDE_VALUES_PARAM = 'hideValues';
const HIDDEN_VALUE_MASK = '••••';

const getHideValuesFromSearchParams = (
  searchParams: URLSearchParams | { get(name: string): string | null },
) => searchParams.get(HIDE_VALUES_PARAM) === '1';

const getSearchParamsWithHideValues = (
  searchParams: URLSearchParams | { toString(): string },
  hideValues: boolean,
) => {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  if (hideValues) {
    nextSearchParams.set(HIDE_VALUES_PARAM, '1');
  } else {
    nextSearchParams.delete(HIDE_VALUES_PARAM);
  }

  return nextSearchParams;
};

const formatHiddenCurrencyAmount = (currency: string) =>
  `${HIDDEN_VALUE_MASK} ${currency}`;

const formatHiddenSignedCurrencyAmount = (
  amount: number | null,
  currency: string,
) => {
  if (amount === null) {
    return `n/a ${currency}`;
  }

  return `${amount >= 0 ? '+' : '-'}${HIDDEN_VALUE_MASK} ${currency}`;
};

const formatHiddenMoney = (amount: number | null, symbol = '£') => {
  if (amount === null) {
    return 'n/a';
  }

  return `${amount < 0 ? '-' : ''}${symbol}${HIDDEN_VALUE_MASK}`;
};

export {
  HIDE_VALUES_PARAM,
  HIDDEN_VALUE_MASK,
  formatHiddenCurrencyAmount,
  formatHiddenMoney,
  formatHiddenSignedCurrencyAmount,
  getHideValuesFromSearchParams,
  getSearchParamsWithHideValues,
};
