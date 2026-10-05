import type { AppError, PortfolioExport } from '@portfolio/domain';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parsePortfolioActivityCsv } from './portfolio-activity-csv';

const PORTFOLIO_EXPORT_USAGE =
  'Usage: pnpm main export-portfolio [--output <path-to-json>] [--activity-csv <path-to-t212-csv>]';

const getDefaultPortfolioExportPath = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `./exports/${year}-${month}-${day}__portfolio.json`;
};

type PortfolioExportCommand = {
  outputPath: string;
  activityCsvPath?: string;
};

const parsePortfolioExportArgs = (
  args: string[],
):
  | { ok: true; value: PortfolioExportCommand }
  | { ok: false; error: AppError } => {
  let outputPath: string | undefined;
  let activityCsvPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];

    if (flag !== '--output' && flag !== '--activity-csv') {
      return {
        ok: false,
        error: validationError(`Unknown flag: ${flag ?? ''}.`),
      };
    }

    const value = args[index + 1];
    if (!value?.trim()) {
      return {
        ok: false,
        error: validationError(`The ${flag} flag requires a path.`),
      };
    }

    if (flag === '--output' && outputPath) {
      return {
        ok: false,
        error: validationError('The --output flag can only be provided once.'),
      };
    }
    if (flag === '--activity-csv' && activityCsvPath) {
      return {
        ok: false,
        error: validationError(
          'The --activity-csv flag can only be provided once.',
        ),
      };
    }

    if (flag === '--output') outputPath = value.trim();
    else activityCsvPath = value.trim();
    index += 1;
  }

  return {
    ok: true,
    value: {
      outputPath: outputPath ?? getDefaultPortfolioExportPath(),
      ...(activityCsvPath && { activityCsvPath }),
    },
  };
};

const addPortfolioActivity = async (
  portfolio: PortfolioExport,
  activityCsvPath: string,
): Promise<PortfolioExport> => ({
  ...portfolio,
  accountActivity: parsePortfolioActivityCsv(
    await readFile(path.resolve(activityCsvPath), 'utf8'),
  ),
});

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
  addPortfolioActivity,
  getDefaultPortfolioExportPath,
  parsePortfolioExportArgs,
  PORTFOLIO_EXPORT_USAGE,
  writePortfolioExport,
};
