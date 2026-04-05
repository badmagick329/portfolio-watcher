import { z } from 'zod';

type FetchParams<T> = {
  endPoint: string;
  schema: z.ZodType<T>;
  creds: string;
  method?: 'GET' | 'POST';
  body?: unknown;
};

export type { FetchParams };
