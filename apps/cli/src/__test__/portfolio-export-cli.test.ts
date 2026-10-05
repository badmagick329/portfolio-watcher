import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  parsePortfolioExportArgs,
  writePortfolioExport,
} from '../portfolio-export-cli';

describe('portfolio export CLI', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('defaults to a dated filename using the local calendar date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 0, 30));

    expect(parsePortfolioExportArgs([])).toEqual({
      ok: true,
      value: { outputPath: './exports/2026-01-05__portfolio.json' },
    });
    expect(parsePortfolioExportArgs(['--activity-csv', 'activity.csv'])).toEqual({
      ok: true,
      value: {
        outputPath: './exports/2026-01-05__portfolio.json',
        activityCsvPath: 'activity.csv',
      },
    });
  });

  test('accepts one explicit output path', () => {
    expect(parsePortfolioExportArgs(['--output', 'portfolio.json'])).toEqual({
      ok: true,
      value: { outputPath: 'portfolio.json' },
    });
    expect(
      parsePortfolioExportArgs([
        '--activity-csv',
        'activity.csv',
        '--output',
        'portfolio.json',
      ]),
    ).toEqual({
      ok: true,
      value: { outputPath: 'portfolio.json', activityCsvPath: 'activity.csv' },
    });
    expect(parsePortfolioExportArgs(['--format', 'csv'])).toMatchObject({
      ok: false,
      error: { message: 'Unknown flag: --format.' },
    });
  });

  test('writes formatted JSON and creates parent directories', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'portfolio export '));
    const outputPath = path.join(directory, 'nested folder', 'portfolio.json');
    const portfolio = {
      asOf: '2026-08-24T12:00:00.000Z',
      accountCurrency: 'GBP',
      summary: {
        holdingsValue: 0,
        holdingsCost: 0,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 0,
        totalAccountValue: 0,
      },
      holdings: [],
      holdingHistory: [],
    };

    const resolvedPath = await writePortfolioExport(outputPath, portfolio);

    expect(resolvedPath).toBe(path.resolve(outputPath));
    await expect(readFile(resolvedPath, 'utf8')).resolves.toBe(
      `${JSON.stringify(portfolio, null, 2)}\n`,
    );
  });
});
