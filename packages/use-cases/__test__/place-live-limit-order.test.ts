import { describe, expect, test, vi } from 'vitest';
import type {
  BrokerClient,
  BrokerDataManager,
  OrderExecutionAttempt,
  ResolvedOrderInstrument,
  T212LimitOrderResponse,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { createPlaceLiveLimitOrder } from '../place-live-limit-order';

const resolvedInstrument: ResolvedOrderInstrument = {
  ticker: 'AAPL_US_EQ',
  isin: 'US0378331005',
  name: 'Apple',
  currencyCode: 'USD',
};

const limitOrderResponse: T212LimitOrderResponse = {
  id: 88,
  ticker: 'AAPL_US_EQ',
  quantity: 2,
  filledQuantity: 0,
  status: 'NEW',
  side: 'BUY',
  createdAt: '2026-04-04T10:15:00.000Z',
  limitPrice: 100.23,
  timeInForce: 'DAY',
  type: 'LIMIT',
};

describe('placeLiveLimitOrder', () => {
  test('dry run builds and audits a day limit order without submitting', async () => {
    const saveOrderExecutionAttempt = vi.fn(() => okAsync(undefined));
    const placeLimitOrder = vi.fn(() => okAsync(limitOrderResponse));

    const useCase = createPlaceLiveLimitOrder({
      client: { placeLimitOrder } satisfies Pick<BrokerClient, 'placeLimitOrder'>,
      dataManager: {
        saveOrderExecutionAttempt,
      } satisfies Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'apple',
      side: 'buy',
      quantity: 2,
      limitPrice: 100.23,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionMode).toBe('dry_run');
      expect(result.value.timeValidity).toBe('DAY');
      expect(result.value.limitPrice).toBe(100.23);
    }
    expect(placeLimitOrder).not.toHaveBeenCalled();
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'limit',
        executionMode: 'dry_run',
        requestedMode: 'quantity',
        requestedQuantity: 2,
        derivedQuantity: 2,
        extendedHours: false,
        limitPrice: 100.23,
        timeValidity: 'DAY',
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test('submits a confirmed sell order with a negative quantity', async () => {
    const saveOrderExecutionAttempt = vi.fn(() => okAsync(undefined));
    const placeLimitOrder = vi.fn(() => okAsync(limitOrderResponse));

    const useCase = createPlaceLiveLimitOrder({
      client: { placeLimitOrder } satisfies Pick<BrokerClient, 'placeLimitOrder'>,
      dataManager: {
        saveOrderExecutionAttempt,
      } satisfies Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'AAPL_US_EQ',
      side: 'sell',
      quantity: 2,
      limitPrice: 101,
      confirm: true,
    });

    expect(result.isOk()).toBe(true);
    expect(placeLimitOrder).toHaveBeenCalledWith({
      ticker: 'AAPL_US_EQ',
      quantity: -2,
      limitPrice: 101,
      timeValidity: 'DAY',
    });
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'limit',
        executionMode: 'submitted',
        requestedQuantity: 2,
        limitPrice: 101,
        timeValidity: 'DAY',
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test('rejects an invalid limit price before resolving the instrument', async () => {
    const resolveInstrumentForOrder = vi.fn(() => okAsync(resolvedInstrument));
    const useCase = createPlaceLiveLimitOrder({
      client: {
        placeLimitOrder: vi.fn(() => okAsync(limitOrderResponse)),
      } satisfies Pick<BrokerClient, 'placeLimitOrder'>,
      dataManager: {
        saveOrderExecutionAttempt: vi.fn(() => okAsync(undefined)),
      } satisfies Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>,
      resolveInstrumentForOrder,
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'AAPL_US_EQ',
      side: 'buy',
      quantity: 2,
      limitPrice: 0,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'The --limit-price flag must be a positive number.',
      );
    }
    expect(resolveInstrumentForOrder).not.toHaveBeenCalled();
  });

  test('audits broker submission failures', async () => {
    const saveOrderExecutionAttempt = vi.fn(() => okAsync(undefined));
    const useCase = createPlaceLiveLimitOrder({
      client: {
        placeLimitOrder: vi.fn(() =>
          errAsync({ code: 'API', message: 'Rejected' } as const),
        ),
      } satisfies Pick<BrokerClient, 'placeLimitOrder'>,
      dataManager: {
        saveOrderExecutionAttempt,
      } satisfies Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'AAPL_US_EQ',
      side: 'buy',
      quantity: 2,
      limitPrice: 100.23,
      confirm: true,
    });

    expect(result.isErr()).toBe(true);
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'limit',
        executionMode: 'submitted',
        errorCode: 'API',
        errorMessage: 'Rejected',
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });
});
