import type {
  BrokerClient,
  BrokerClientWithCache,
  Cache,
  HistoricalOrdersParams,
} from '@portfolio/domain';
import {
  accountCashSchema,
  accountSummarySchema,
  historicalOrdersSchema,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { endPoints } from './end-points';
import { fetchRequest } from './utils';

const createTrading212Client = () => {
  const creds = Buffer.from(
    `${process.env.API_KEY}:${process.env.API_SECRET}`,
    'utf-8',
  ).toBase64();

  const fetchAccountCash = () =>
    fetchRequest({
      endPoint: endPoints.accountCash,
      schema: accountCashSchema,
      creds,
    });

  const fetchAccountSummary = () =>
    fetchRequest({
      endPoint: endPoints.accountSummary,
      schema: accountSummarySchema,
      creds,
    });

  const fetchHistoricalOrders = (params: HistoricalOrdersParams) =>
    fetchRequest({
      endPoint: endPoints.historicalOrders(params),
      schema: historicalOrdersSchema,
      creds,
    });

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    endPoints,
    creds,
  } satisfies BrokerClient;
};

const createTrading212ClientWithCache = (cache: Cache) => {
  const client = createTrading212Client();

  const fetchAccountCash = () => {
    const saved = cache.typesafeGet(
      client.endPoints.accountCash,
      accountCashSchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountCash().andTee((json) => {
      cache.save(client.endPoints.accountCash, JSON.stringify(json));
    });
  };

  const fetchAccountSummary = () => {
    const saved = cache.typesafeGet(
      client.endPoints.accountSummary,
      accountSummarySchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountSummary().andTee((json) => {
      cache.save(client.endPoints.accountSummary, JSON.stringify(json));
    });
  };

  const fetchHistoricalOrders = (params: HistoricalOrdersParams) => {
    const endpoint = client.endPoints.historicalOrders(params);
    const saved = cache.typesafeGet(endpoint, historicalOrdersSchema);
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchHistoricalOrders(params).andTee((json) => {
      cache.save(endpoint, JSON.stringify(json));
    });
  };

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    endPoints: client.endPoints,
    resetCache: cache.reset,
    creds: client.creds,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
