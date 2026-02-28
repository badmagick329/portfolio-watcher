import type { BrokerClient, BrokerClientWithCache } from '@/core/broker-client';
import type { Cache } from '@/core/cache';
import type { AppError } from '@/types';
import { accountCashSchema } from '@/types/schemas/api-responses';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';

const paperUrl = 'https://demo.trading212.com/api/v0';
const liveUrl = 'https://live.trading212.com/api/v0';
const endPoints = {
  accountCash: `${liveUrl}/equity/account/cash`,
};

const fetchRequest = <T>({
  endPoint,
  schema,
  creds,
}: {
  endPoint: string;
  schema: z.ZodType<T>;
  creds: string;
}): ResultAsync<T, AppError> =>
  ResultAsync.fromPromise(
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
    )
    .andThen((json): ResultAsync<T, AppError> => {
      const parsed = schema.safeParse(json);
      return parsed.success
        ? okAsync(parsed.data)
        : errAsync({
            code: 'API',
            message: `Invalid account cash schema: ${parsed.error.message}`,
          });
    });

const createTrading212Client = () => {
  const creds = Buffer.from(
    `${process.env.API_KEY}:${process.env.API_SECRET}`,
    'utf-8',
  ).toBase64();

  const fetchAccountCash = () =>
    fetchRequest({
      endPoint: endPoints.accountCash,
      schema: accountCashSchema,
      creds,
    });

  return {
    fetchAccountCash,
    endPoints,
  } satisfies BrokerClient;
};

const createTrading212ClientWithCache = (cache: Cache) => {
  const client = createTrading212Client();

  const fetchAccountCash = () => {
    const saved = cache.typesafeGet(
      client.endPoints.accountCash,
      accountCashSchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountCash().andTee((json) => {
      cache.save(client.endPoints.accountCash, JSON.stringify(json));
    });
  };

  return {
    fetchAccountCash,
    endPoints: client.endPoints,
    resetCache: cache.reset,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
