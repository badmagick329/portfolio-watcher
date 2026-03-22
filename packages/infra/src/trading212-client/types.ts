import { z } from 'zod';

type FetchParams<T> = {
  endPoint: string;
  schema: z.ZodType<T>;
  creds: string;
};

export type { FetchParams };
