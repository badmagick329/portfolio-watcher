import type {
  AppError,
  InstrumentRiskClient,
  InstrumentRiskProfile,
} from '@portfolio/domain';
import { ResultAsync, errAsync } from 'neverthrow';
import { z } from 'zod';

const fmpProfileSchema = z.object({
  symbol: z.string(),
  companyName: z.string().nullable().optional(),
  isin: z.string().nullable().optional(),
  beta: z.number().nullable().optional(),
});

const fmpProfileResponseSchema = z.array(fmpProfileSchema);

const createFmpClient = ({
  apiKey = process.env.FMP_API_KEY,
  baseUrl = 'https://financialmodelingprep.com/stable',
}: {
  apiKey?: string;
  baseUrl?: string;
} = {}): InstrumentRiskClient => {
  const fetchInstrumentRiskProfile = (symbol: string) => {
    if (!apiKey) {
      return errAsync(validationError('FMP_API_KEY is required.'));
    }

    return ResultAsync.fromPromise(
      fetch(
        `${baseUrl}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
      ).then(async (response) => {
        const body = await response.text();

        if (response.status === 429) {
          throw new FmpRateLimitError(
            `FMP profile request rate limited: ${body}`,
          );
        }

        if (!response.ok) {
          throw new ApiResponseError(
            `FMP profile request failed with ${response.status}: ${body}`,
          );
        }

        const parsed = fmpProfileResponseSchema.parse(JSON.parse(body));
        const profile = parsed[0];

        if (!profile) {
          return {
            symbol,
            companyName: null,
            isin: null,
            beta: null,
          } satisfies InstrumentRiskProfile;
        }

        return {
          symbol: profile.symbol,
          companyName: profile.companyName ?? null,
          isin: profile.isin ?? null,
          beta:
            typeof profile.beta === 'number' && Number.isFinite(profile.beta)
              ? profile.beta
              : null,
        } satisfies InstrumentRiskProfile;
      }),
      (error): AppError => {
        if (error instanceof z.ZodError) {
          return validationError(`Invalid FMP profile response: ${error.message}`);
        }

        if (error instanceof FmpRateLimitError) {
          return {
            code: 'RATE_LIMIT',
            message: error.message,
            rateLimitResponse: {
              rateLimitLimit: 0,
              rateLimitPeriodSec: 0,
              rateLimitRemaining: 0,
              rateLimitResetEpoch: 0,
              rateLimitUsed: 0,
            },
          };
        }

        return {
          code: error instanceof ApiResponseError ? 'API' : 'NETWORK',
          message: error instanceof Error ? error.message : String(error),
        };
      },
    );
  };

  return { fetchInstrumentRiskProfile };
};

class ApiResponseError extends Error {}
class FmpRateLimitError extends Error {}

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export { createFmpClient };
