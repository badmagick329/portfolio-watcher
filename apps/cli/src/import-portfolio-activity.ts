import type { PortfolioExport } from '@portfolio/domain';
import { readFile } from 'node:fs/promises';
import {
  addPortfolioActivity,
  getDefaultPortfolioExportPath,
  writePortfolioExport,
} from './portfolio-export-cli';

const portfolioPath = getDefaultPortfolioExportPath();
const activityCsvPath = './data/t212-activity.csv';

const portfolio = JSON.parse(
  await readFile(portfolioPath, 'utf8'),
) as PortfolioExport;
const completePortfolio = await addPortfolioActivity(
  portfolio,
  activityCsvPath,
);
await writePortfolioExport(portfolioPath, completePortfolio);

console.log('Portfolio activity imported.');
console.log(
  'cash movements:',
  completePortfolio.accountActivity!.cashMovements.length,
);
console.log(
  'trade charges:',
  completePortfolio.accountActivity!.tradeCharges.length,
);
