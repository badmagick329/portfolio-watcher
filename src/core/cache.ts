import type { AppError } from "@/types";
import type { Result } from "neverthrow";
import { z } from "zod";

export interface Cache {
  save: (key: string, content: string) => Result<void, AppError>;
  get: (key: string) => string | undefined;
  typesafeGet: <T>(key: string, schema: z.ZodType<T>) => T | undefined;
  reset: () => Result<void, AppError>;
}
