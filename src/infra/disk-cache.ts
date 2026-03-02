import type { Cache } from '@/core/cache';
import { toFileError } from '@/core/errors';
import type { Logger, LoggerCreator } from '@/core/logger';
import type { AppError } from '@/types';
import { type CacheType } from '@/types/schemas/cache';
import { cacheSchema } from '@/types/schemas/cache';
import { Result } from 'neverthrow';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

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
    (e) => toFileError(e, 'Failed to init cache'),
  )(cacheFilePath);

const loadCache = (resolvedPath: string) =>
  Result.fromThrowable(
    (filePath) => {
      if (fs.existsSync(filePath)) {
        console.log('Using existing cache file', filePath);
        const raw = fs.readFileSync(filePath).toString();
        const parsed = cacheSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          throw new Error(`Invalid cache schema: ${parsed.error.message}`);
        }
        return parsed.data;
      }
      return {} satisfies CacheType;
    },
    (e) => toFileError(e, 'Failed to load cache'),
  )(resolvedPath);

const persistCache = (resolvedPath: string, toSave: CacheType) =>
  Result.fromThrowable(
    (filePath, cache) => {
      fs.writeFileSync(filePath, cache ? JSON.stringify(cache) : '{}');
    },
    (e) => toFileError(e, 'Failed to save cache'),
  )(resolvedPath, toSave);

const normalizeContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed !== null && typeof parsed === 'object') {
      return parsed;
    }
  } catch {}
  return content;
};

const createDiskCache = ({
  cacheFilePath,
  expirationPeriodInSeconds,
  loggerCreator,
}: {
  cacheFilePath: string;
  expirationPeriodInSeconds?: number;
  loggerCreator?: LoggerCreator;
}): Result<Cache, AppError> => {
  let cache: CacheType;
  let filePath: string;
  let log: Logger | undefined = undefined;

  const save = (key: string, content: string) => {
    cache[key] = {
      isoTime: new Date(),
      content: normalizeContent(content),
    };
    const result = persistCache(filePath, cache);
    log?.debug('Saved', { key });
    return result;
  };

  const get = (key: string) => {
    const val = cache[key]?.content;
    if (val === undefined) {
      log?.info('Miss', { key });
      return undefined;
    }
    const isoTime = cache[key]?.isoTime;
    if (isoTime && expirationPeriodInSeconds !== undefined) {
      const ageInSeconds =
        (new Date().getTime() - new Date(isoTime).getTime()) / 1000;
      if (ageInSeconds > expirationPeriodInSeconds) {
        log?.info('Expired', { key, ageInSeconds });
        return undefined;
      }
    }

    log?.info('Hit', { key });
    if (typeof val === 'string') {
      return val;
    }
    return JSON.stringify(val);
  };

  const typesafeGet = <T>(key: string, schema: z.ZodType<T>) => {
    const raw = get(key);
    if (raw !== undefined) {
      try {
        const json = JSON.parse(raw);
        const parsed = schema.safeParse(json);
        if (parsed.success) {
          log?.debug('Parsed', { key });
          return parsed.data;
        }
      } catch {}
    }
  };

  const reset = () =>
    persistCache(filePath, {}).map(() => {
      cache = {};
      log?.debug('Cache reset');
      return;
    });

  return init(cacheFilePath).andThen(({ resolvedPath }) =>
    loadCache(resolvedPath).map((loadedCache) => {
      cache = loadedCache;
      filePath = resolvedPath;
      if (loggerCreator) {
        log = loggerCreator('DiskCache');
      }
      log?.debug('Cache initialized', {
        filePath,
        cacheKeys: Object.keys(cache),
      });

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
