import type {
  AppError,
  BrokerClient,
  ResolvedOrderInstrument,
  T212InstrumentMetadataItem,
} from '@portfolio/domain';
import { type ResultAsync, errAsync, okAsync } from 'neverthrow';

const normalize = (value: string) => value.trim().toLowerCase();
const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

const createResolveInstrumentForOrder = (
  client: Pick<BrokerClient, 'fetchInstrumentsMetadata'>,
) => {
  const resolveInstrumentForOrder = (
    instrumentInput: string,
  ): ResultAsync<ResolvedOrderInstrument, AppError> => {
    const normalizedInput = normalize(instrumentInput);

    if (normalizedInput.length === 0) {
      return errAsync(validationError('Instrument input is required.'));
    }

    return client.fetchInstrumentsMetadata().andThen((instruments) => {
      const exactTickerMatch = instruments.find(
        (instrument) => normalize(instrument.ticker) === normalizedInput,
      );

      if (exactTickerMatch) {
        return okAsync(toResolvedOrderInstrument(exactTickerMatch));
      }

      const exactIsinMatch = instruments.find(
        (instrument) => normalize(instrument.isin) === normalizedInput,
      );

      if (exactIsinMatch) {
        return okAsync(toResolvedOrderInstrument(exactIsinMatch));
      }

      const matches = instruments.filter((instrument) => {
        const ticker = normalize(instrument.ticker);
        const publicTicker = normalize(instrument.ticker.split('_')[0] ?? '');
        const name = normalize(instrument.name);

        return (
          ticker.includes(normalizedInput) ||
          publicTicker === normalizedInput ||
          name.includes(normalizedInput)
        );
      });

      if (matches.length === 1) {
        return okAsync(toResolvedOrderInstrument(matches[0]!));
      }

      if (matches.length === 0) {
        return errAsync(
          validationError(
            `No Trading 212 instrument matched "${instrumentInput}".`,
          ),
        );
      }

      const suggestions = matches
        .slice(0, 20)
        .map((instrument) => `${instrument.name} (${instrument.ticker})`)
        .join('\n');

      return errAsync(
        validationError(
          `Multiple instruments matched "${instrumentInput}": ${suggestions}. Use the exact Trading 212 ticker.`,
        ),
      );
    });
  };

  return resolveInstrumentForOrder;
};

const toResolvedOrderInstrument = (
  instrument: T212InstrumentMetadataItem,
): ResolvedOrderInstrument => ({
  ticker: instrument.ticker,
  isin: instrument.isin,
  name: instrument.name,
  currencyCode: instrument.currencyCode,
});

export { createResolveInstrumentForOrder };
