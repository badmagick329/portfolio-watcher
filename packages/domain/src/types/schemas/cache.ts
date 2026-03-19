import { z } from 'zod';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

const jsonObjectSchema = z.record(z.string(), jsonSchema);
const jsonArraySchema = z.array(jsonSchema);

const cachedContentSchema = z.object({
  isoTime: z.coerce.date(),
  content: z.union([z.string(), jsonObjectSchema, jsonArraySchema]),
});

const cacheSchema = z.record(z.string(), cachedContentSchema);

type CacheType = z.infer<typeof cacheSchema>;
type CachedContent = z.infer<typeof cachedContentSchema>;

export type { CacheType, CachedContent };
export { cacheSchema, cachedContentSchema };
