const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getPeriodRiskFreeReturn = ({
  days,
  riskFreeAnnual,
}: {
  days: number;
  riskFreeAnnual: number;
}) => {
  if (!Number.isFinite(riskFreeAnnual) || riskFreeAnnual <= -1) {
    return null;
  }

  return (1 + riskFreeAnnual) ** (days / 365) - 1;
};

const getAlpha = ({
  beta,
  marketReturn,
  periodRiskFreeReturn,
  returnPercent,
}: {
  beta: number | null;
  marketReturn: number;
  periodRiskFreeReturn: number | null;
  returnPercent: number | null;
}) => {
  if (
    beta === null ||
    returnPercent === null ||
    periodRiskFreeReturn === null ||
    !Number.isFinite(marketReturn)
  ) {
    return null;
  }

  return (
    returnPercent -
    (periodRiskFreeReturn + beta * (marketReturn - periodRiskFreeReturn))
  );
};

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export { formatShortDate, getAlpha, getPeriodRiskFreeReturn, roundMoney };
