import type { AppError } from '@/types';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';

const fetchRequest = <T>({
  endPoint,
  schema,
  creds,
}: {
  endPoint: string;
  schema: z.ZodType<T>;
  creds: string;
}): ResultAsync<T, AppError> =>
  fetchRequestRaw({
    endPoint,
    creds,
  }).andThen((json): ResultAsync<T, AppError> => {
    const parsed = schema.safeParse(json);
    return parsed.success
      ? okAsync(parsed.data)
      : errAsync({
          code: 'API',
          message: `Invalid account cash schema: ${parsed.error.message}`,
        });
  });

const fetchRequestRaw = ({
  endPoint,
  creds,
}: {
  endPoint: string;
  creds: string;
}): ResultAsync<unknown, AppError> => {
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

export { fetchRequest, fetchRequestRaw };
