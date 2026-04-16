import type {
  AppError,
  InstrumentCategoryInstrument,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

type RankedMatch = {
  item: InstrumentCategoryInstrument;
  score: number;
};

const normalizeCategory = (category: string) => category.trim().toLowerCase();

const normalizeCategories = (categories: string[] = []) =>
  [...new Set(categories.map(normalizeCategory).filter(Boolean))];

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

const resolveLocalInstrument = (
  input: string,
  findMatches: (
    input: string,
  ) => ResultAsync<InstrumentCategoryInstrument[], AppError>,
): ResultAsync<InstrumentCategoryInstrument, AppError> => {
  const normalizedInput = normalizeCategory(input);

  if (normalizedInput.length === 0) {
    return errAsync(validationError('The --instrument flag is required.'));
  }

  return findMatches(input).andThen((matches) => {
    const rankedMatches = rankMatches(matches, normalizedInput);
    const bestMatch = selectBestMatch(rankedMatches);

    if (bestMatch) {
      return okAsync(bestMatch);
    }

    if (rankedMatches.length === 0) {
      return errAsync(validationError(`No local instrument matched "${input}".`));
    }

    return errAsync(buildAmbiguityError(input, rankedMatches));
  });
};

const rankMatches = (
  matches: InstrumentCategoryInstrument[],
  normalizedInput: string,
) =>
  matches
    .map((item) => ({ item, score: rankMatch(item, normalizedInput) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.item.ticker.localeCompare(right.item.ticker);
    });

const selectBestMatch = (rankedMatches: RankedMatch[]) => {
  const best = rankedMatches[0];
  const second = rankedMatches[1];

  if (!best) {
    return null;
  }

  if (!second || best.score < second.score) {
    return best.item;
  }

  return null;
};

const rankMatch = (
  item: InstrumentCategoryInstrument,
  normalizedInput: string,
) => {
  const ticker = normalizeCategory(item.ticker);
  const publicTicker = normalizeCategory(item.ticker.split('_')[0] ?? '');
  const isin = normalizeCategory(item.isin);
  const name = normalizeCategory(item.name);

  if (ticker === normalizedInput) {
    return 1;
  }

  if (publicTicker === normalizedInput) {
    return 2;
  }

  if (isin === normalizedInput) {
    return 3;
  }

  if (name === normalizedInput) {
    return 4;
  }

  if (ticker.startsWith(normalizedInput) || publicTicker.startsWith(normalizedInput)) {
    return 5;
  }

  if (name.startsWith(normalizedInput)) {
    return 6;
  }

  if (ticker.includes(normalizedInput)) {
    return 7;
  }

  if (name.includes(normalizedInput)) {
    return 8;
  }

  return 0;
};

const buildAmbiguityError = (
  input: string,
  matches: RankedMatch[],
): AppError => {
  const suggestions = matches
    .slice(0, 20)
    .map(({ item }) => `${item.name} (${item.ticker})`)
    .join('\n');

  return validationError(
    `Multiple local instruments matched "${input}": ${suggestions}. Use the exact ticker or ISIN.`,
  );
};

export {
  normalizeCategories,
  normalizeCategory,
  resolveLocalInstrument,
  validationError,
};
