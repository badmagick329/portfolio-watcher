import { z } from "zod";

const cachedContentSchema = z.object({
  isoTime: z.coerce.date(),
  content: z.string(),
});
const cacheSchema = z.record(z.string(), cachedContentSchema);

type CacheType = z.infer<typeof cacheSchema>;
type CachedContent = z.infer<typeof cachedContentSchema>;

export type { CacheType, CachedContent };
export { cacheSchema, cachedContentSchema };
