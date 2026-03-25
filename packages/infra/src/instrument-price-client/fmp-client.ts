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

const fmpSearchIsinSchema = z.array(
  z.object({
    symbol: z.string(),
    name: z.string().optional(),
    companyName: z.string().optional(),
    currency: z.string().nullable().optional(),
    exchange: z.string().nullable().optional(),
    exchangeShortName: z.string().nullable().optional(),
    stockExchange: z.string().nullable().optional(),
    isin: z.string().nullable().optional(),
  }),
);

const fmpHistoricalPriceSchema = z.union([
  z.array(
    z.object({
      date: z.string(),
      price: z.number().nullable().optional(),
      close: z.number().nullable().optional(),
      symbol: z.string().optional(),
      volume: z.number().nullable().optional(),
    }),
  ),
  z.object({
    symbol: z.string().optional(),
    historical: z.array(
      z.object({
        date: z.string(),
        price: z.number().nullable().optional(),
        close: z.number().nullable().optional(),
      }),
    ),
  }),
]);

const baseUrl = 'https://financialmodelingprep.com/stable';

const createFmpInstrumentPriceClient = () => {
  const apiKey = process.env.FMP_API_KEY;

  const resolveByIsin = (input: ResolveInstrumentPriceByIsinInput) => {
    if (!apiKey) {
      return errAsync<InstrumentPriceResolution | null, AppError>({
        code: 'API',
        message: 'FMP_API_KEY is not configured',
      });
    }

    const endPoint =
      `${baseUrl}/search-isin?isin=${encodeURIComponent(input.isin)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    return fetchJson(endPoint, fmpSearchIsinSchema).map((payload) =>
      pickBestResolution(
        input,
        payload.map(
          (item) =>
            ({
              isin: item.isin ?? input.isin,
              provider: 'fmp',
              providerSymbol: item.symbol,
              providerExchange:
                item.exchangeShortName ?? item.exchange ?? item.stockExchange ?? 'UNKNOWN',
              providerMic: null,
              resolvedName: item.name ?? item.companyName ?? input.name,
              resolvedCurrency: item.currency ?? null,
              resolutionConfidence: 0.9,
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
        message: 'FMP_API_KEY is not configured',
      });
    }

    const endPoint =
      `${baseUrl}/historical-price-eod/light?symbol=${encodeURIComponent(source.providerSymbol)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    return fetchJson(endPoint, fmpHistoricalPriceSchema).andThen((payload) => {
      const historical = Array.isArray(payload) ? payload : payload.historical;
      const latest = historical[0];

      if (!latest || (latest.price ?? latest.close) == null) {
        return errAsync<InstrumentPriceFetchResult, AppError>({
          code: 'API',
          message: `FMP returned no historical price rows for ${source.providerSymbol}`,
        });
      }

      return okAsync({
        provider: 'fmp',
        providerSymbol: source.providerSymbol,
        currency: source.resolvedCurrency ?? 'USD',
        price: latest.price ?? latest.close ?? 0,
        priceType: 'eod',
        asOf: latest.date,
      } as const);
    });
  };

  return {
    provider: 'fmp',
    resolveByIsin,
    fetchLatestPrice,
  } satisfies InstrumentPriceClient;
};

export { createFmpInstrumentPriceClient };
