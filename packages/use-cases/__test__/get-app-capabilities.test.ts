import { describe, expect, test } from 'vitest';
import { okAsync } from 'neverthrow';
import type { AppDataState, BrokerDataManager } from '@portfolio/domain';
import { createGetAppCapabilities } from '../get-app-capabilities';

describe('getAppCapabilities', () => {
  test('returns disabled capabilities when config is missing', async () => {
    const getAppCapabilities = createGetAppCapabilities({
      dataManager: {
        getAppDataState: () =>
          okAsync({
            hasHistoricalOrders: false,
            hasCurrentHoldings: false,
            hasCategories: false,
            hasStoredRiskMetrics: false,
            hasSuccessfulSubmittedOrderAttempt: false,
            lastOrdersSyncAt: null,
            lastPortfolioSyncAt: null,
            lastRiskMetricsSyncAt: null,
          } satisfies AppDataState),
        getFeatureFlag: () => okAsync(false),
      } satisfies Pick<BrokerDataManager, 'getAppDataState' | 'getFeatureFlag'>,
      config: {},
    });

    const result = await getAppCapabilities();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({
        hasBrokerCredentials: false,
        canSyncOrders: false,
        canSyncPortfolioState: false,
        canPlaceOrders: false,
        hasFmpApiKey: false,
        riskMetricsFeatureEnabled: false,
        canSyncRiskMetrics: false,
        brokerAccessMode: 'missing',
      });
    }
  });

  test('returns mixed capability state from config and stored data', async () => {
    const getAppCapabilities = createGetAppCapabilities({
      dataManager: {
        getAppDataState: () =>
          okAsync({
            hasHistoricalOrders: true,
            hasCurrentHoldings: true,
            hasCategories: true,
            hasStoredRiskMetrics: true,
            hasSuccessfulSubmittedOrderAttempt: false,
            lastOrdersSyncAt: '2026-04-22T10:00:00.000Z',
            lastPortfolioSyncAt: '2026-04-22T10:01:00.000Z',
            lastRiskMetricsSyncAt: '2026-04-22T10:02:00.000Z',
          } satisfies AppDataState),
        getFeatureFlag: () => okAsync(false),
      } satisfies Pick<BrokerDataManager, 'getAppDataState' | 'getFeatureFlag'>,
      config: {
        apiKey: 'key',
        apiSecret: 'secret',
        fmpApiKey: '',
      },
    });

    const result = await getAppCapabilities();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({
        hasBrokerCredentials: true,
        canSyncOrders: true,
        canSyncPortfolioState: true,
        canPlaceOrders: true,
        hasFmpApiKey: false,
        riskMetricsFeatureEnabled: false,
        canSyncRiskMetrics: false,
        hasStoredRiskMetrics: true,
        brokerAccessMode: 'read_only_or_unknown',
      });
    }
  });

  test('marks trading enabled once a submitted order has succeeded', async () => {
    const getAppCapabilities = createGetAppCapabilities({
      dataManager: {
        getAppDataState: () =>
          okAsync({
            hasHistoricalOrders: true,
            hasCurrentHoldings: false,
            hasCategories: false,
            hasStoredRiskMetrics: false,
            hasSuccessfulSubmittedOrderAttempt: true,
            lastOrdersSyncAt: null,
            lastPortfolioSyncAt: null,
            lastRiskMetricsSyncAt: null,
          } satisfies AppDataState),
        getFeatureFlag: () => okAsync(true),
      } satisfies Pick<BrokerDataManager, 'getAppDataState' | 'getFeatureFlag'>,
      config: {
        apiKey: 'key',
        apiSecret: 'secret',
        fmpApiKey: 'fmp',
      },
    });

    const result = await getAppCapabilities();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.brokerAccessMode).toBe('trading_enabled');
      expect(result.value.riskMetricsFeatureEnabled).toBe(true);
      expect(result.value.canSyncRiskMetrics).toBe(true);
    }
  });
});
