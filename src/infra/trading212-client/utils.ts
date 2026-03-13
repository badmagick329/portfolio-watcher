import type {
  FetchParams,
  RawWithRateLimitResult,
} from '@/infra/trading212-client/types';
import type { AppError, RateLimitResponse } from '@/types';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import type { Trading212Response } from './types';

const fetchRequest = <T>({
  endPoint,
  schema,
  creds,
}: FetchParams<T>): ResultAsync<T, AppError> =>
  fetchRequestRaw({
    endPoint,
    creds,
  }).andThen((json): ResultAsync<T, AppError> => {
    const parsed = schema.safeParse(json);
    return parsed.success
      ? okAsync(parsed.data)
      : errAsync({
          code: 'API',
          message: `Invalid schema: ${parsed.error.message}`,
        });
  });

const fetchRequestWithRateLimit = <T>({
  endPoint,
  schema,
  creds,
}: FetchParams<T>): ResultAsync<
  { data?: T; rateLimitResponse: RateLimitResponse },
  AppError
> =>
  fetchRequestRawWithRateLimit({
    endPoint,
    creds,
  }).andThen(
    (
      resp,
    ): ResultAsync<
      { data?: T; rateLimitResponse: RateLimitResponse },
      AppError
    > => {
      if (resp.rateLimited) {
        return okAsync({
          data: undefined,
          rateLimitResponse: resp.rateLimitResponse,
        });
      }

      const parsed = schema.safeParse(resp.json);

      if (!parsed.success) {
        return errAsync({
          code: 'API',
          message: `Invalid schema: ${parsed.error.message}`,
        });
      }

      return okAsync({
        data: parsed.data,
        rateLimitResponse: resp.rateLimitResponse,
      });
    },
  );

const fetchRequestRaw = <T>({
  endPoint,
  creds,
}: Omit<FetchParams<T>, 'schema'>): ResultAsync<unknown, AppError> => {
  return ResultAsync.fromPromise(
    fetch(endPoint, {
      headers: { Authorization: `Basic ${creds}` },
    }),
    (e): AppError => ({
      code: 'NETWORK',
      message: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
    }),
  )
    .andThen(
      (resp): ResultAsync<Response, AppError> =>
        resp.ok
          ? okAsync(resp)
          : errAsync({
              code: 'API',
              message: `Trading212 returned ${resp.status} - ${resp.statusText}`,
            }),
    )
    .andThen(
      (resp): ResultAsync<unknown, AppError> =>
        ResultAsync.fromPromise(
          resp.json(),
          (e): AppError => ({
            code: 'API',
            message: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
          }),
        ),
    );
};

const fetchRequestRawWithRateLimit = <T>({
  endPoint,
  creds,
}: Omit<FetchParams<T>, 'schema'>): ResultAsync<
  RawWithRateLimitResult,
  AppError
> => {
  return ResultAsync.fromPromise(
    fetch(endPoint, {
      headers: { Authorization: `Basic ${creds}` },
    }),
    (e): AppError => ({
      code: 'NETWORK',
      message: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
    }),
  )
    .andThen((resp): ResultAsync<Trading212Response, AppError> => {
      let rateLimitResponse: undefined | RateLimitResponse = undefined;
      const rateLimitLimit = resp.headers.get('x-ratelimit-limit');
      const rateLimitPeriod = resp.headers.get('x-ratelimit-period');
      const rateLimitRemaining = resp.headers.get('x-ratelimit-remaining');
      const rateLimitReset = resp.headers.get('x-ratelimit-reset');
      const rateLimitUsed = resp.headers.get('x-ratelimit-used');
      if (
        rateLimitLimit &&
        rateLimitPeriod &&
        rateLimitRemaining &&
        rateLimitReset
      ) {
        rateLimitResponse = {
          rateLimitLimit: Number(rateLimitLimit),
          rateLimitPeriodSec: Number(rateLimitPeriod),
          rateLimitRemaining: Number(rateLimitRemaining),
          rateLimitResetEpoch: Number(rateLimitReset),
          rateLimitUsed: Number(rateLimitUsed),
        };
      }

      if (
        rateLimitResponse &&
        (Number.isNaN(rateLimitResponse.rateLimitLimit) ||
          Number.isNaN(rateLimitResponse.rateLimitPeriodSec) ||
          Number.isNaN(rateLimitResponse.rateLimitRemaining) ||
          Number.isNaN(rateLimitResponse.rateLimitResetEpoch) ||
          Number.isNaN(rateLimitResponse.rateLimitUsed))
      ) {
        return errAsync({
          code: 'API',
          message: 'Trading212 returned invalid rate limit headers',
        });
      }

      if (rateLimitResponse) {
        return okAsync({
          response: resp,
          rateLimitResponse,
        });
      }
      return errAsync({
        code: 'API',
        message: `Trading212 returned ${resp.status} - ${resp.statusText}`,
      });
    })
    .andThen(
      ({
        response,
        rateLimitResponse,
      }): ResultAsync<RawWithRateLimitResult, AppError> => {
        if (response.status === 429) {
          return okAsync({
            json: undefined,
            rateLimitResponse,
            rateLimited: true,
          });
        }

        if (!response.ok) {
          return errAsync({
            code: 'API',
            message: `Trading212 returned ${response.status} - ${response.statusText}`,
          });
        }

        return ResultAsync.fromPromise(
          response.json(),
          (e): AppError => ({
            code: 'API',
            message: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
          }),
        ).map((json) => ({
          json,
          rateLimitResponse,
          rateLimited: false,
        }));
      },
    );
};

export {
  fetchRequest,
  fetchRequestRaw,
  fetchRequestWithRateLimit,
  fetchRequestRawWithRateLimit,
};
