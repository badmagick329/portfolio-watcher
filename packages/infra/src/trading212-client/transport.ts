import type { AppError, RateLimitResponse } from '@portfolio/domain';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import type { FetchParams } from './types';

const emptyRateLimitResponse = (): RateLimitResponse => ({
  rateLimitLimit: 0,
  rateLimitPeriodSec: 0,
  rateLimitRemaining: 0,
  rateLimitResetEpoch: 0,
  rateLimitUsed: 0,
});

const request = <T>({
  endPoint,
  schema,
  creds,
  method,
  body,
}: FetchParams<T>): ResultAsync<T, AppError> =>
  fetchRequestRaw({
    endPoint,
    creds,
    method,
    body,
  }).andThen((json): ResultAsync<T, AppError> => {
    const parsed = schema.safeParse(json);
    return parsed.success
      ? okAsync(parsed.data)
      : errAsync({
          code: 'API',
          message: `Invalid schema: ${parsed.error.message}`,
        });
  });

const fetchRequestRaw = <T>({
  endPoint,
  creds,
  method = 'GET',
  body,
}: Omit<FetchParams<T>, 'schema'>): ResultAsync<unknown, AppError> => {
  const headers: Record<string, string> = {
    Authorization: `Basic ${creds}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return ResultAsync.fromPromise(
    fetch(endPoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    (e): AppError => ({
      code: 'NETWORK',
      message: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
    }),
  )
    .andThen((resp): ResultAsync<Response, AppError> => {
      if (resp.ok) {
        return okAsync(resp);
      }

      if (resp.status === 429) {
        return errAsync({
          code: 'RATE_LIMIT',
          message: `Trading212 returned 429 - ${resp.statusText} from ${resp.url}`,
          rateLimitResponse: parseRateLimitHeaders(resp) ?? emptyRateLimitResponse(),
        });
      }

      if (resp.status === 403) {
        return errAsync({
          code: 'FORBIDDEN',
          message: `Trading212 returned 403 - ${resp.statusText} from ${resp.url}`,
        });
      }

      return errAsync({
        code: 'API',
        message: `Trading212 returned ${resp.status} - ${resp.statusText} from ${resp.url}`,
      });
    })
    .andThen((resp): ResultAsync<unknown, AppError> =>
      ResultAsync.fromPromise(
        resp.json(),
        (e): AppError => ({
          code: 'API',
          message: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
        }),
      ),
    );
};

const parseRateLimitHeaders = (resp: Response): RateLimitResponse | undefined => {
  const rateLimitLimit = resp.headers.get('x-ratelimit-limit');
  const rateLimitPeriod = resp.headers.get('x-ratelimit-period');
  const rateLimitRemaining = resp.headers.get('x-ratelimit-remaining');
  const rateLimitReset = resp.headers.get('x-ratelimit-reset');
  const rateLimitUsed = resp.headers.get('x-ratelimit-used');

  if (
    !rateLimitLimit ||
    !rateLimitPeriod ||
    !rateLimitRemaining ||
    !rateLimitReset ||
    !rateLimitUsed
  ) {
    return undefined;
  }

  const parsed = {
    rateLimitLimit: Number(rateLimitLimit),
    rateLimitPeriodSec: Number(rateLimitPeriod),
    rateLimitRemaining: Number(rateLimitRemaining),
    rateLimitResetEpoch: Number(rateLimitReset),
    rateLimitUsed: Number(rateLimitUsed),
  };

  if (
    Number.isNaN(parsed.rateLimitLimit) ||
    Number.isNaN(parsed.rateLimitPeriodSec) ||
    Number.isNaN(parsed.rateLimitRemaining) ||
    Number.isNaN(parsed.rateLimitResetEpoch) ||
    Number.isNaN(parsed.rateLimitUsed)
  ) {
    return undefined;
  }

  return parsed;
};

export { request };
