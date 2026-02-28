import type { AppError } from '@/types';

const toFileError = (e: unknown, context: string): AppError => ({
  code: 'FILE_IO',
  message: `${context}: ${e instanceof Error ? e.message : String(e)}`,
});

export { toFileError };
