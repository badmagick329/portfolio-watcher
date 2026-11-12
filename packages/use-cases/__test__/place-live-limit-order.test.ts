import { describe, expect, test, vi } from 'vitest';
import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  OrderExecutionAttempt,
  ResolvedOrderInstrument,
  T212LimitOrderResponse,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
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

  test('submits and audits the requested good-till-cancel validity', async () => {
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
      side: 'buy',
      quantity: 2,
      limitPrice: 90,
      timeValidity: 'GOOD_TILL_CANCEL',
      confirm: true,
    });

    expect(result.isOk() && result.value.timeValidity).toBe('GOOD_TILL_CANCEL');
    expect(placeLimitOrder).toHaveBeenCalledWith({
      ticker: 'AAPL_US_EQ',
      quantity: 2,
      limitPrice: 90,
      timeValidity: 'GOOD_TILL_CANCEL',
    });
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'submitted',
        timeValidity: 'GOOD_TILL_CANCEL',
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

  test('returns a 4xx broker rejection as is and audits it', async () => {
    const { submit, saveOrderExecutionAttempt } = confirmedOrderWith(
      errAsync({ code: 'API', message: 'Rejected', status: 400 } as const),
    );

    const result = await submit();

    expect(result.isErr() && result.error).toEqual({
      code: 'API',
      message: 'Rejected',
      status: 400,
    });
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'limit',
        executionMode: 'submitted',
        errorCode: 'API',
        errorMessage: 'Rejected',
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test.each([
    ['a network error', { code: 'NETWORK', message: 'Request failed: socket hang up' }],
    ['a 5xx response', { code: 'API', message: 'Trading212 returned 502', status: 502 }],
    ['an unreadable 2xx body', { code: 'API', message: 'Invalid schema: id' }],
  ] satisfies [string, AppError][])(
    'reports %s as an unknown outcome and audits it',
    async (_, brokerError) => {
      const { submit, saveOrderExecutionAttempt } = confirmedOrderWith(
        errAsync(brokerError),
      );

      const result = await submit();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('ORDER_OUTCOME_UNKNOWN');
        expect(result.error.message).toContain(brokerError.message);
        expect(result.error.message).toContain('Check open orders');
        expect(result.error.message).toContain('duplicate');
      }
      expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          executionMode: 'submitted',
          errorCode: 'ORDER_OUTCOME_UNKNOWN',
        } satisfies Partial<OrderExecutionAttempt>),
      );
    },
  );

  test('keeps a placed order as success when its audit save fails', async () => {
    const { submit } = confirmedOrderWith(
      okAsync(limitOrderResponse),
      errAsync({ code: 'DATABASE', message: 'disk full' } as const),
    );

    const result = await submit();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.brokerOrder?.id).toBe(88);
      expect(result.value.auditWarning).toContain('disk full');
    }
  });
});

const confirmedOrderWith = (
  brokerResult: ReturnType<BrokerClient['placeLimitOrder']>,
  saveResult: ResultAsync<void, AppError> = okAsync(undefined),
) => {
  const saveOrderExecutionAttempt = vi.fn(() => saveResult);
  const useCase = createPlaceLiveLimitOrder({
    client: {
      placeLimitOrder: vi.fn(() => brokerResult),
    } satisfies Pick<BrokerClient, 'placeLimitOrder'>,
    dataManager: {
      saveOrderExecutionAttempt,
    } satisfies Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>,
    resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
    now: () => new Date('2026-04-04T10:20:00.000Z'),
  });

  return {
    saveOrderExecutionAttempt,
    submit: () =>
      useCase({
        instrument: 'AAPL_US_EQ',
        side: 'buy',
        quantity: 2,
        limitPrice: 100.23,
        confirm: true,
      }),
  };
};
