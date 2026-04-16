import type { HistoricalOrdersParams } from '@portfolio/domain';

const demoBase = 'https://demo.trading212.com';
const liveBase = 'https://live.trading212.com';
const demoUrl = `${demoBase}/api/v0`;
const liveUrl = `${liveBase}/api/v0`;

const endPoints = {
  accountCash: `${liveUrl}/equity/account/cash`,
  accountSummary: `${liveUrl}/equity/account/summary`,
  instrumentsMetadata: `${liveUrl}/equity/metadata/instruments`,
  liveLimitOrders: `${liveUrl}/equity/orders/limit`,
  liveMarketOrders: `${liveUrl}/equity/orders/market`,
  positions: `${liveUrl}/equity/positions`,
  historicalOrders: (params: HistoricalOrdersParams) =>
    `${liveUrl}/equity/history/orders?${new URLSearchParams({
      cursor: params?.cursor || '',
      ticker: params?.ticker || '',
      limit: params?.limit || '',
    }).toString()}`,
};

const resolveEndPoint = (path: string, isLive: boolean = true) =>
  path.startsWith('http') ? path : `${isLive ? liveBase : demoBase}${path}`;

export { endPoints, resolveEndPoint };
