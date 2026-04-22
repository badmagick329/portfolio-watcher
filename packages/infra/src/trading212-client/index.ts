import type {
  AppError,
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
  limitOrderResponseSchema,
  marketOrderResponseSchema,
  positionsSchema,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { endPoints, resolveEndPoint } from './end-points';
import { request } from './transport';

const getTrading212Credentials = (): string | AppError => {
  const apiKey = process.env.API_KEY?.trim();
  const apiSecret = process.env.API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    return {
      code: 'VALIDATION',
      message: 'Trading 212 API credentials are required.',
    };
  }

  return Buffer.from(`${apiKey}:${apiSecret}`, 'utf-8').toString('base64');
};

const resolveHistoricalOrdersEndpoint = (input: HistoricalOrdersInput) =>
  'nextPagePath' in input
    ? resolveEndPoint(input.nextPagePath)
    : endPoints.historicalOrders(input);

const createTrading212Client = () => {
  const creds = getTrading212Credentials();

  if (typeof creds !== 'string') {
    return {
      fetchAccountCash: () => errAsync(creds),
      fetchAccountSummary: () => errAsync(creds),
      fetchHistoricalOrders: () => errAsync(creds),
      fetchInstrumentsMetadata: () => errAsync(creds),
      placeMarketOrder: () => errAsync(creds),
      placeLimitOrder: () => errAsync(creds),
      fetchPositions: () => errAsync(creds),
    } satisfies BrokerClient;
  }

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

  const placeLimitOrder = (input: {
    ticker: string;
    quantity: number;
    limitPrice: number;
    timeValidity: 'DAY';
  }) =>
    request({
      endPoint: endPoints.liveLimitOrders,
      schema: limitOrderResponseSchema,
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
    placeLimitOrder,
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
    placeLimitOrder: client.placeLimitOrder,
    fetchPositions,
    resetCache: cache.reset,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
