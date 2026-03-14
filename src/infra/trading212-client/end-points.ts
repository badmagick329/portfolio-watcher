import type { HistoricalOrdersParams } from '@/types';

const paperBase = 'https://demo.trading212.com';
const liveBase = 'https://live.trading212.com';
const paperUrl = `${paperBase}/api/v0`;
const liveUrl = `${liveBase}/api/v0`;

const endPoints = {
  accountCash: `${liveUrl}/equity/account/cash`,
  accountSummary: `${liveUrl}/equity/account/summary`,
  historicalOrders: (params: HistoricalOrdersParams) =>
    `${liveUrl}/equity/history/orders?${new URLSearchParams({
      cursor: params?.cursor || '',
      ticker: params?.ticker || '',
      limit: params?.limit || '',
    }).toString()}`,
};

const resolveEndPoint = (path: string, isLive: boolean = true) =>
  path.startsWith('http') ? path : `${isLive ? liveBase : paperBase}${path}`;

export { endPoints, resolveEndPoint };
