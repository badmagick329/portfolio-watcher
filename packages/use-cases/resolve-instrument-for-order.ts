import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  ResolvedOrderInstrument,
  T212InstrumentCatalogItem,
  T212InstrumentMetadataItem,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

type Params = {
  client: Pick<BrokerClient, 'fetchInstrumentsMetadata'>;
  dataManager: Pick<
    BrokerDataManager,
    'findT212InstrumentCatalogMatches' | 'saveT212InstrumentCatalogItems'
  >;
  now?: () => Date;
};

const normalize = (value: string) => value.trim().toLowerCase();
const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

const createResolveInstrumentForOrder = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => {
  const resolveInstrumentForOrder = (
    instrumentInput: string,
  ): ResultAsync<ResolvedOrderInstrument, AppError> => {
    const normalizedInput = normalize(instrumentInput);

    if (normalizedInput.length === 0) {
      return errAsync(validationError('Instrument input is required.'));
    }

    return dataManager
      .findT212InstrumentCatalogMatches(instrumentInput)
      .andThen((catalogMatches) => {
        const rankedLocalMatches = rankMatches(catalogMatches, normalizedInput);
        const bestLocalMatch = selectBestMatch(rankedLocalMatches);

        if (bestLocalMatch) {
          return okAsync(toResolvedOrderInstrument(bestLocalMatch));
        }

        if (rankedLocalMatches.length > 1) {
          return errAsync(buildAmbiguityError(instrumentInput, rankedLocalMatches));
        }

        const fetchedAt = now().toISOString();

        return client.fetchInstrumentsMetadata().andThen((metadataItems) => {
          const catalogItems = metadataItems.map((item) =>
            toCatalogItem(item, fetchedAt),
          );

          return dataManager
            .saveT212InstrumentCatalogItems(catalogItems)
            .andThen(() =>
              dataManager.findT212InstrumentCatalogMatches(instrumentInput),
            )
            .andThen((refreshedMatches) => {
              const rankedRefreshedMatches = rankMatches(
                refreshedMatches,
                normalizedInput,
              );
              const bestRefreshedMatch = selectBestMatch(rankedRefreshedMatches);

              if (bestRefreshedMatch) {
                return okAsync(toResolvedOrderInstrument(bestRefreshedMatch));
              }

              if (rankedRefreshedMatches.length === 0) {
                return errAsync(
                  validationError(
                    `No Trading 212 instrument matched "${instrumentInput}".`,
                  ),
                );
              }

              return errAsync(
                buildAmbiguityError(instrumentInput, rankedRefreshedMatches),
              );
            });
        });
      });
  };

  return resolveInstrumentForOrder;
};

const rankMatches = (
  matches: T212InstrumentCatalogItem[],
  normalizedInput: string,
) =>
  matches
    .map((item) => ({
      item,
      score: rankMatch(item, normalizedInput),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.item.ticker.localeCompare(right.item.ticker);
    })
    .map((entry) => ({
      item: entry.item,
      score: entry.score,
    }));

const selectBestMatch = (
  rankedMatches: Array<{ item: T212InstrumentCatalogItem; score: number }>,
): T212InstrumentCatalogItem | null => {
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
  item: T212InstrumentCatalogItem,
  normalizedInput: string,
): number => {
  const ticker = normalize(item.ticker);
  const publicTicker = normalize(item.ticker.split('_')[0] ?? '');
  const isin = normalize(item.isin);
  const name = normalize(item.name);
  const shortName = normalize(item.shortName ?? '');

  if (ticker === normalizedInput) {
    return 1;
  }

  if (publicTicker === normalizedInput) {
    return item.instrumentType === 'STOCK' || item.instrumentType === 'ETF'
      ? 2
      : 3;
  }

  if (isin === normalizedInput) {
    return 4;
  }

  if (name === normalizedInput || shortName === normalizedInput) {
    return 5;
  }

  if (ticker.startsWith(normalizedInput) || publicTicker.startsWith(normalizedInput)) {
    return item.instrumentType === 'STOCK' || item.instrumentType === 'ETF'
      ? 6
      : 7;
  }

  if (name.startsWith(normalizedInput) || shortName.startsWith(normalizedInput)) {
    return 8;
  }

  if (ticker.includes(normalizedInput)) {
    return 9;
  }

  if (name.includes(normalizedInput) || shortName.includes(normalizedInput)) {
    return 10;
  }

  return 0;
};

const buildAmbiguityError = (
  instrumentInput: string,
  matches: Array<{ item: T212InstrumentCatalogItem; score: number }>,
): AppError => {
  const suggestions = matches
    .slice(0, 20)
    .map(({ item }) => `${item.name} (${item.ticker})`)
    .join('\n');

  return validationError(
    `Multiple instruments matched "${instrumentInput}": ${suggestions}. Use the exact Trading 212 ticker.`,
  );
};

const toCatalogItem = (
  item: T212InstrumentMetadataItem,
  fetchedAt: string,
): T212InstrumentCatalogItem => ({
  ticker: item.ticker,
  isin: item.isin,
  name: item.name,
  shortName: item.shortName,
  instrumentType: item.type,
  currencyCode: item.currencyCode,
  extendedHours: item.extendedHours,
  maxOpenQuantity: item.maxOpenQuantity,
  addedOn: item.addedOn,
  fetchedAt,
});

const toResolvedOrderInstrument = (
  item: T212InstrumentCatalogItem,
): ResolvedOrderInstrument => ({
  ticker: item.ticker,
  isin: item.isin,
  name: item.name,
  currencyCode: item.currencyCode,
});

export { createResolveInstrumentForOrder };
