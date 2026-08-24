import type { AppError, PortfolioExport } from '@portfolio/domain';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PORTFOLIO_EXPORT_USAGE =
  'Usage: pnpm main export-portfolio --output <path-to-json>';

type PortfolioExportCommand = {
  outputPath: string;
};

const parsePortfolioExportArgs = (
  args: string[],
):
  | { ok: true; value: PortfolioExportCommand }
  | { ok: false; error: AppError } => {
  let outputPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];

    if (flag !== '--output') {
      return {
        ok: false,
        error: validationError(`Unknown flag: ${flag ?? ''}.`),
      };
    }

    const value = args[index + 1];
    if (!value?.trim()) {
      return {
        ok: false,
        error: validationError('The --output flag requires a path.'),
      };
    }

    if (outputPath) {
      return {
        ok: false,
        error: validationError('The --output flag can only be provided once.'),
      };
    }

    outputPath = value.trim();
    index += 1;
  }

  if (!outputPath) {
    return {
      ok: false,
      error: validationError('The --output flag is required.'),
    };
  }

  return { ok: true, value: { outputPath } };
};

const writePortfolioExport = async (
  outputPath: string,
  portfolio: PortfolioExport,
) => {
  const resolvedPath = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(
    resolvedPath,
    `${JSON.stringify(portfolio, null, 2)}\n`,
    'utf8',
  );
  return resolvedPath;
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export {
  parsePortfolioExportArgs,
  PORTFOLIO_EXPORT_USAGE,
  writePortfolioExport,
};
