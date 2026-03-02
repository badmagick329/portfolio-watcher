import type { HistoricalOrdersParams } from '@/types';

const paperUrl = 'https://demo.trading212.com/api/v0';
const liveUrl = 'https://live.trading212.com/api/v0';

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

export { endPoints };
