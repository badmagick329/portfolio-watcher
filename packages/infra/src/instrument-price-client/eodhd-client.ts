import type {
  AppError,
  InstrumentPriceClient,
  InstrumentPriceFetchResult,
  InstrumentPriceResolution,
  InstrumentPriceSource,
  ResolveInstrumentPriceByIsinInput,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';
import { fetchJson, pickBestResolution } from './shared';

const eodhdSearchSchema = z.array(
  z.object({
    Code: z.string(),
    Exchange: z.string(),
    Name: z.string(),
    Currency: z.string().nullable().optional(),
    ISIN: z.string().nullable().optional(),
    Type: z.string().nullable().optional(),
    isPrimary: z.boolean().optional(),
  }),
);

const eodhdEodSchema = z.union([
  z.array(
    z.object({
      date: z.string(),
      close: z.number().nullable().optional(),
      adjusted_close: z.number().nullable().optional(),
    }),
  ),
  z.object({
    date: z.string().optional(),
    close: z.number().nullable().optional(),
    adjusted_close: z.number().nullable().optional(),
  }),
]);

const baseUrl = 'https://eodhd.com/api';

const createEodhdInstrumentPriceClient = () => {
  const apiKey = process.env.EODHD_API_KEY;

  const resolveByIsin = (input: ResolveInstrumentPriceByIsinInput) => {
    if (!apiKey) {
      return errAsync<InstrumentPriceResolution | null, AppError>({
        code: 'API',
        message: 'EODHD_API_KEY is not configured',
      });
    }

    const endPoint =
      `${baseUrl}/search/${encodeURIComponent(input.isin)}` +
      `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;

    return fetchJson(endPoint, eodhdSearchSchema).map((payload) =>
      pickBestResolution(
        input,
        payload.map(
          (item) =>
            ({
              isin: item.ISIN ?? input.isin,
              provider: 'eodhd',
              providerSymbol: item.Code,
              providerExchange: item.Exchange,
              providerMic: null,
              resolvedName: item.Name,
              resolvedCurrency: item.Currency ?? null,
              resolutionConfidence: 0.8,
              isPrimary: item.isPrimary ?? false,
            }) satisfies InstrumentPriceResolution,
        ),
      ),
    );
  };

  const fetchLatestPrice = (
    source: InstrumentPriceSource | InstrumentPriceResolution,
  ) => {
    if (!apiKey) {
      return errAsync<InstrumentPriceFetchResult, AppError>({
        code: 'API',
        message: 'EODHD_API_KEY is not configured',
      });
    }

    const endPoint =
      `${baseUrl}/eod/${encodeURIComponent(source.providerSymbol)}.${encodeURIComponent(source.providerExchange)}` +
      `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;

    return fetchJson(endPoint, eodhdEodSchema).andThen((payload) => {
      const latest = Array.isArray(payload) ? payload[0] : payload;

      if (!latest || (latest.close ?? latest.adjusted_close) == null || !latest.date) {
        return errAsync<InstrumentPriceFetchResult, AppError>({
          code: 'API',
          message: `EODHD returned no usable EOD price for ${source.providerSymbol}.${source.providerExchange}`,
        });
      }

      return okAsync({
        provider: 'eodhd',
        providerSymbol: source.providerSymbol,
        currency: source.resolvedCurrency ?? 'USD',
        price: latest.close ?? latest.adjusted_close ?? 0,
        priceType: 'eod',
        asOf: latest.date,
      } as const);
    });
  };

  return {
    provider: 'eodhd',
    resolveByIsin,
    fetchLatestPrice,
  } satisfies InstrumentPriceClient;
};

export { createEodhdInstrumentPriceClient };
