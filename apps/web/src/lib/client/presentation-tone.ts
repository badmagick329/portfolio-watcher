type PresentationTone = 'positive' | 'negative' | 'neutral';

const getSignedTone = (
  value: number | null | undefined,
): PresentationTone => {
  if (value === null || value === undefined || value === 0) {
    return 'neutral';
  }

  return value > 0 ? 'positive' : 'negative';
};

const getToneTextClassName = (tone: PresentationTone) => {
  if (tone === 'positive') {
    return 'text-positive';
  }

  if (tone === 'negative') {
    return 'text-negative';
  }

  return '';
};

const getSignedToneTextClassName = (value: number | null | undefined) =>
  getToneTextClassName(getSignedTone(value));

export {
  getSignedTone,
  getSignedToneTextClassName,
  getToneTextClassName,
};
export type { PresentationTone };
