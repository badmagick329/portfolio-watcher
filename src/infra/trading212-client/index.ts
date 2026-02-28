import type { BrokerClient, BrokerClientWithCache } from '@/core/broker-client';
import type { Cache } from '@/core/cache';
import { endPoints } from '@/infra/trading212-client/end-points';
import { fetchRequest } from '@/infra/trading212-client/utils';
import {
  accountCashSchema,
  accountSummarySchema,
} from '@/types/schemas/api-responses';
import { okAsync } from 'neverthrow';

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

  return {
    fetchAccountCash,
    fetchAccountSummary,
    endPoints,
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

  return {
    fetchAccountCash,
    fetchAccountSummary,
    endPoints: client.endPoints,
    resetCache: cache.reset,
  } satisfies BrokerClientWithCache;
};

export { createTrading212Client, createTrading212ClientWithCache };
