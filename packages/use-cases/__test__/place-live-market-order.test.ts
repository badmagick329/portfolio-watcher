import { describe, expect, test, vi } from 'vitest';
import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  InstrumentPriceSnapshot,
  OrderExecutionAttempt,
  ResolvedOrderInstrument,
  T212MarketOrderResponse,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { createPlaceLiveMarketOrder } from '../place-live-market-order';

const resolvedInstrument: ResolvedOrderInstrument = {
  ticker: 'AAPL_US_EQ',
  isin: 'US0378331005',
  name: 'Apple',
  currencyCode: 'USD',
};

const marketOrderResponse: T212MarketOrderResponse = {
  id: 77,
  ticker: 'AAPL_US_EQ',
  quantity: 2,
  filledQuantity: 2,
  status: 'filled',
  side: 'buy',
  createdAt: '2026-04-04T10:15:00.000Z',
};

describe('placeLiveMarketOrder', () => {
  test('derives quantity from value mode using the latest stored price', async () => {
    const saveOrderExecutionAttempt = vi.fn(() => okAsync(undefined));
    const getLatestInstrumentPriceByIsin = vi.fn(() =>
      okAsync({
        isin: 'US0378331005',
        provider: 't212',
        providerSymbol: 'AAPL_US_EQ',
        currency: 'USD',
        price: 200,
        priceType: 'position_current',
        asOf: '2026-04-04T10:10:00.000Z',
        fetchedAt: '2026-04-04T10:10:00.000Z',
      } satisfies InstrumentPriceSnapshot),
    );
    const placeMarketOrder = vi.fn(() => okAsync(marketOrderResponse));

    const useCase = createPlaceLiveMarketOrder({
      client: { placeMarketOrder } satisfies Pick<BrokerClient, 'placeMarketOrder'>,
      dataManager: {
        getLatestInstrumentPriceByIsin,
        saveOrderExecutionAttempt,
      } satisfies Pick<
        BrokerDataManager,
        'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
      >,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'apple',
      side: 'buy',
      value: 100,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionMode).toBe('dry_run');
      expect(result.value.requestedMode).toBe('value');
      expect(result.value.derivedQuantity).toBe(0.5);
      expect(result.value.referencePrice).toBe(200);
    }
    expect(placeMarketOrder).not.toHaveBeenCalled();
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'dry_run',
        requestedMode: 'value',
        requestedValue: 100,
        derivedQuantity: 0.5,
        referencePrice: 200,
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test('fails value mode when no stored price exists', async () => {
    const useCase = createPlaceLiveMarketOrder({
      client: {
        placeMarketOrder: vi.fn(() => okAsync(marketOrderResponse)),
      } satisfies Pick<BrokerClient, 'placeMarketOrder'>,
      dataManager: {
        getLatestInstrumentPriceByIsin: () => okAsync(undefined),
        saveOrderExecutionAttempt: vi.fn(() => okAsync(undefined)),
      } satisfies Pick<
        BrokerDataManager,
        'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
      >,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'apple',
      side: 'buy',
      value: 100,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('No stored price is available');
    }
  });

  test('submits a confirmed order and persists the attempt', async () => {
    const saveOrderExecutionAttempt = vi.fn(() => okAsync(undefined));
    const placeMarketOrder = vi.fn(() => okAsync(marketOrderResponse));

    const useCase = createPlaceLiveMarketOrder({
      client: { placeMarketOrder } satisfies Pick<BrokerClient, 'placeMarketOrder'>,
      dataManager: {
        getLatestInstrumentPriceByIsin: vi.fn(() => okAsync(undefined)),
        saveOrderExecutionAttempt,
      } satisfies Pick<
        BrokerDataManager,
        'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
      >,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    });

    const result = await useCase({
      instrument: 'AAPL_US_EQ',
      side: 'sell',
      quantity: 2,
      confirm: true,
    });

    expect(result.isOk()).toBe(true);
    expect(placeMarketOrder).toHaveBeenCalledWith({
      ticker: 'AAPL_US_EQ',
      quantity: -2,
      extendedHours: false,
    });
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'submitted',
        requestedMode: 'quantity',
        requestedQuantity: 2,
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test('maps forbidden broker responses to a clear order placement message', async () => {
    const result = await createPlaceLiveMarketOrder({
      client: {
        placeMarketOrder: vi.fn(() =>
          errAsync({
            code: 'FORBIDDEN',
            message: 'raw forbidden',
          } as const),
        ),
      } satisfies Pick<BrokerClient, 'placeMarketOrder'>,
      dataManager: {
        getLatestInstrumentPriceByIsin: vi.fn(() => okAsync(undefined)),
        saveOrderExecutionAttempt: vi.fn(() => okAsync(undefined)),
      } satisfies Pick<
        BrokerDataManager,
        'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
      >,
      resolveInstrumentForOrder: () => okAsync(resolvedInstrument),
      now: () => new Date('2026-04-04T10:20:00.000Z'),
    })({
      instrument: 'AAPL_US_EQ',
      side: 'buy',
      quantity: 2,
      confirm: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Broker key does not allow live order placement.',
      );
    }
  });

  test('returns a 4xx broker rejection as is and audits it once', async () => {
    const { submit, saveOrderExecutionAttempt } = confirmedOrderWith(
      errAsync({ code: 'API', message: 'Rejected', status: 400 } as const),
    );

    const result = await submit();

    expect(result.isErr() && result.error.code).toBe('API');
    expect(saveOrderExecutionAttempt).toHaveBeenCalledTimes(1);
    expect(saveOrderExecutionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'submitted',
        derivedQuantity: 2,
        errorCode: 'API',
      } satisfies Partial<OrderExecutionAttempt>),
    );
  });

  test.each([
    ['a network error', { code: 'NETWORK', message: 'Request failed: socket hang up' }],
    ['a 5xx response', { code: 'API', message: 'Trading212 returned 503', status: 503 }],
    ['an unreadable 2xx body', { code: 'API', message: 'Invalid JSON body: Unexpected end' }],
  ] satisfies [string, AppError][])(
    'reports %s as an unknown outcome and audits it once',
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
      }
      expect(saveOrderExecutionAttempt).toHaveBeenCalledTimes(1);
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
      okAsync(marketOrderResponse),
      errAsync({ code: 'DATABASE', message: 'disk full' } as const),
    );

    const result = await submit();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.brokerOrder?.id).toBe(77);
      expect(result.value.auditWarning).toContain('disk full');
    }
  });
});

const confirmedOrderWith = (
  brokerResult: ReturnType<BrokerClient['placeMarketOrder']>,
  saveResult: ResultAsync<void, AppError> = okAsync(undefined),
) => {
  const saveOrderExecutionAttempt = vi.fn(() => saveResult);
  const useCase = createPlaceLiveMarketOrder({
    client: {
      placeMarketOrder: vi.fn(() => brokerResult),
    } satisfies Pick<BrokerClient, 'placeMarketOrder'>,
    dataManager: {
      getLatestInstrumentPriceByIsin: vi.fn(() => okAsync(undefined)),
      saveOrderExecutionAttempt,
    } satisfies Pick<
      BrokerDataManager,
      'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
    >,
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
        confirm: true,
      }),
  };
};
