import type {
  BrokerClient,
  BrokerClientWithCache,
  Cache,
  HistoricalOrdersInput,
} from '@portfolio/domain';
import {
  accountCashSchema,
  accountSummarySchema,
  historicalOrdersSchema,
  instrumentsMetadataSchema,
  marketOrderResponseSchema,
  positionsSchema,
} from '@portfolio/domain';
import { okAsync } from 'neverthrow';
import { endPoints, resolveEndPoint } from './end-points';
import { request } from './transport';

const createCreds = () =>
  Buffer.from(
    `${process.env.API_KEY}:${process.env.API_SECRET}`,
    'utf-8',
  ).toString('base64');

const resolveHistoricalOrdersEndpoint = (input: HistoricalOrdersInput) =>
  'nextPagePath' in input
    ? resolveEndPoint(input.nextPagePath)
    : endPoints.historicalOrders(input);

const createTrading212Client = () => {
  const creds = createCreds();

  const fetchAccountCash = () =>
    request({
      endPoint: endPoints.accountCash,
      schema: accountCashSchema,
      creds,
    });

  const fetchAccountSummary = () =>
    request({
      endPoint: endPoints.accountSummary,
      schema: accountSummarySchema,
      creds,
    });

  const fetchHistoricalOrders = (input: HistoricalOrdersInput) =>
    request({
      endPoint: resolveHistoricalOrdersEndpoint(input),
      schema: historicalOrdersSchema,
      creds,
    });

  const fetchInstrumentsMetadata = () =>
    request({
      endPoint: endPoints.instrumentsMetadata,
      schema: instrumentsMetadataSchema,
      creds,
    });

  const placeMarketOrder = (input: {
    ticker: string;
    quantity: number;
    extendedHours: boolean;
  }) =>
    request({
      endPoint: endPoints.liveMarketOrders,
      schema: marketOrderResponseSchema,
      creds,
      method: 'POST',
      body: input,
    });

  const fetchPositions = () =>
    request({
      endPoint: endPoints.positions,
      schema: positionsSchema,
      creds,
    });

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    fetchInstrumentsMetadata,
    placeMarketOrder,
    fetchPositions,
  } satisfies BrokerClient;
};

const createTrading212ClientWithCache = (cache: Cache) => {
  const client = createTrading212Client();

  const fetchAccountCash = () => {
    const saved = cache.typesafeGet(endPoints.accountCash, accountCashSchema);
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountCash().andTee((json) => {
      cache.save(endPoints.accountCash, JSON.stringify(json));
    });
  };

  const fetchAccountSummary = () => {
    const saved = cache.typesafeGet(
      endPoints.accountSummary,
      accountSummarySchema,
    );
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchAccountSummary().andTee((json) => {
      cache.save(endPoints.accountSummary, JSON.stringify(json));
    });
  };

  const fetchHistoricalOrders = (input: HistoricalOrdersInput) => {
    const endpoint = resolveHistoricalOrdersEndpoint(input);
    const saved = cache.typesafeGet(endpoint, historicalOrdersSchema);
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchHistoricalOrders(input).andTee((json) => {
      cache.save(endpoint, JSON.stringify(json));
    });
  };

  const fetchPositions = () => {
    const saved = cache.typesafeGet(endPoints.positions, positionsSchema);
    if (saved) {
      return okAsync(saved);
    }
    return client.fetchPositions().andTee((json) => {
      cache.save(endPoints.positions, JSON.stringify(json));
    });
  };

  return {
    fetchAccountCash,
    fetchAccountSummary,
    fetchHistoricalOrders,
    fetchInstrumentsMetadata: client.fetchInstrumentsMetadata,
    placeMarketOrder: client.placeMarketOrder,
    fetchPositions,
    resetCache: cache.reset,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
