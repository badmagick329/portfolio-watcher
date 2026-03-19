import type { RateLimitResponse } from '@portfolio/domain';
import { z } from 'zod';

type FetchParams<T> = {
  endPoint: string;
  schema: z.ZodType<T>;
  creds: string;
};

type RawWithRateLimitResult = {
  json: unknown;
  rateLimitResponse: RateLimitResponse;
  rateLimited: boolean;
};

type Trading212Response = {
  response: Response;
  rateLimitResponse: RateLimitResponse;
};

export type { FetchParams, RawWithRateLimitResult, Trading212Response };
