import * as fs from "node:fs";
import * as path from "node:path";
import { Result } from "neverthrow";
import type { Cache } from "@/core/cache";
import type { AppError } from "@/types";
import { type CacheType } from "@/types/schemas/cache";
import { cacheSchema } from "@/types/schemas/cache";
import { toFileError } from "@/core/errors";
import { z } from "zod";

const init = (cacheFilePath: string) =>
  Result.fromThrowable(
    (filePath) => {
      const resolvedPath = path.resolve(filePath);
      const parent = path.dirname(resolvedPath);
      fs.mkdirSync(parent, { recursive: true });
      if (!fs.existsSync(parent)) {
        throw new Error(`Failed to create cache directory: ${parent}`);
      }
      return {
        resolvedPath,
      };
    },
    (e) => toFileError(e, "Failed to init cache"),
  )(cacheFilePath);

const loadCache = (resolvedPath: string) =>
  Result.fromThrowable(
    (filePath) => {
      if (fs.existsSync(filePath)) {
        console.log("Using existing cache file", filePath);
        const raw = fs.readFileSync(filePath).toString();
        const parsed = cacheSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          throw new Error(`Invalid cache schema: ${parsed.error.message}`);
        }
        return parsed.data;
      }
      return {} satisfies CacheType;
    },
    (e) => toFileError(e, "Failed to load cache"),
  )(resolvedPath);

const persistCache = (resolvedPath: string, toSave: CacheType) =>
  Result.fromThrowable(
    (filePath, cache) => {
      fs.writeFileSync(filePath, cache ? JSON.stringify(cache) : "{}");
    },
    (e) => toFileError(e, "Failed to save cache"),
  )(resolvedPath, toSave);

const createDiskCache = (cacheFilePath: string): Result<Cache, AppError> => {
  let cache: CacheType;
  let filePath: string;

  const save = (key: string, content: string) => {
    cache[key] = {
      isoTime: new Date(),
      content,
    };
    return persistCache(filePath, cache);
  };

  const get = (key: string) => cache[key]?.content;
  const typesafeGet = <T>(key: string, schema: z.ZodType<T>) => {
    const raw = get(key);
    if (raw) {
      try {
        const json = JSON.parse(raw);
        const parsed = schema.safeParse(json);
        if (parsed.success) {
          return parsed.data;
        }
      } catch {}
    }
  };
  const reset = () =>
    persistCache(filePath, {}).map(() => {
      cache = {};
      return;
    });

  return init(cacheFilePath).andThen(({ resolvedPath }) =>
    loadCache(resolvedPath).map((loadedCache) => {
      cache = loadedCache;
      filePath = resolvedPath;
      return {
        save,
        get,
        typesafeGet,
        reset,
      } satisfies Cache;
    }),
  );
};

export { createDiskCache };
