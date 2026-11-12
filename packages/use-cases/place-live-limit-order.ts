import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  LimitOrderTimeValidity,
  OrderExecutionAttempt,
  PlaceLimitOrderInput,
  PlaceLimitOrderResult,
  ResolvedOrderInstrument,
  T212LimitOrderRequest,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import {
  normalizeOrderPlacementError,
  submitLiveOrder,
} from './submit-live-order';

type Params = {
  client: Pick<BrokerClient, 'placeLimitOrder'>;
  dataManager: Pick<BrokerDataManager, 'saveOrderExecutionAttempt'>;
  resolveInstrumentForOrder: (
    instrumentInput: string,
  ) => ResultAsync<ResolvedOrderInstrument, AppError>;
  now?: () => Date;
};

const createPlaceLiveLimitOrder = ({
  client,
  dataManager,
  resolveInstrumentForOrder,
  now = () => new Date(),
}: Params) => {
  const placeLiveLimitOrder = (
    input: PlaceLimitOrderInput,
    attemptedAt: string,
  ): ResultAsync<PlaceLimitOrderResult, AppError> => {
    const validationError = validatePlaceLimitOrderInput(input);

    if (validationError) {
      return errAsync(validationError);
    }

    const timeValidity = input.timeValidity ?? 'DAY';

    return resolveInstrumentForOrder(input.instrument).andThen(
      (resolvedInstrument) => {
        const brokerRequest = toLimitOrderRequest({
          resolvedInstrument,
          side: input.side,
          quantity: input.quantity,
          limitPrice: input.limitPrice,
          timeValidity,
        });
        const baseAttempt = {
          orderType: 'limit' as const,
          environment: 'live' as const,
          instrumentInput: input.instrument,
          resolvedTicker: resolvedInstrument.ticker,
          resolvedIsin: resolvedInstrument.isin,
          resolvedName: resolvedInstrument.name,
          side: input.side,
          requestedMode: 'quantity' as const,
          requestedQuantity: input.quantity,
          requestedValue: null,
          derivedQuantity: input.quantity,
          referencePrice: null,
          extendedHours: false,
          limitPrice: input.limitPrice,
          timeValidity,
          brokerRequestPayload: JSON.stringify(brokerRequest),
          attemptedAt,
        };

        if (!input.confirm) {
          return dataManager
            .saveOrderExecutionAttempt({
              ...baseAttempt,
              executionMode: 'dry_run',
              brokerResponsePayload: null,
              errorCode: null,
              errorMessage: null,
            })
            .map(
              () =>
                ({
                  environment: 'live',
                  executionMode: 'dry_run',
                  resolvedInstrument,
                  requestedMode: 'quantity',
                  requestedQuantity: input.quantity,
                  requestedValue: null,
                  derivedQuantity: input.quantity,
                  referencePrice: null,
                  extendedHours: false,
                  limitPrice: input.limitPrice,
                  timeValidity,
                  brokerOrder: null,
                  auditWarning: null,
                }) satisfies PlaceLimitOrderResult,
            );
        }

        return submitLiveOrder({
          brokerOrder: client.placeLimitOrder(brokerRequest),
          recordAttempt: (outcome) =>
            dataManager.saveOrderExecutionAttempt({
              ...baseAttempt,
              executionMode: 'submitted',
              ...outcome,
            }),
          toResult: (brokerOrder, auditWarning) =>
            ({
              environment: 'live',
              executionMode: 'submitted',
              resolvedInstrument,
              requestedMode: 'quantity',
              requestedQuantity: input.quantity,
              requestedValue: null,
              derivedQuantity: input.quantity,
              referencePrice: null,
              extendedHours: false,
              limitPrice: input.limitPrice,
              timeValidity,
              brokerOrder,
              auditWarning,
            }) satisfies PlaceLimitOrderResult,
        });
      },
    );
  };

  return (
    input: PlaceLimitOrderInput,
  ): ResultAsync<PlaceLimitOrderResult, AppError> => {
    const attemptedAt = now().toISOString();

    return placeLiveLimitOrder(input, attemptedAt).orElse((error) => {
      const normalizedError = normalizeOrderPlacementError(error);
      const validationError = validatePlaceLimitOrderInput(input);
      if (validationError) {
        return errAsync(normalizedError);
      }

      if (normalizedError.code !== 'VALIDATION') {
        return errAsync(normalizedError);
      }

      const fallbackAttempt: OrderExecutionAttempt = {
        orderType: 'limit',
        environment: 'live',
        instrumentInput: input.instrument,
        resolvedTicker: '',
        resolvedIsin: '',
        resolvedName: '',
        side: input.side,
        requestedMode: 'quantity',
        requestedQuantity: input.quantity,
        requestedValue: null,
        derivedQuantity: input.quantity,
        referencePrice: null,
        extendedHours: false,
        limitPrice: input.limitPrice,
        timeValidity: input.timeValidity ?? 'DAY',
        executionMode: input.confirm ? 'submitted' : 'dry_run',
        brokerRequestPayload: '',
        brokerResponsePayload: null,
        errorCode: normalizedError.code,
        errorMessage: normalizedError.message,
        attemptedAt,
      };

      return dataManager
        .saveOrderExecutionAttempt(fallbackAttempt)
        .orElse(() => okAsync(undefined))
        .andThen(() => errAsync(normalizedError));
    });
  };
};

const validatePlaceLimitOrderInput = (
  input: PlaceLimitOrderInput,
): AppError | null => {
  if (!input.instrument.trim()) {
    return validationError('The --instrument flag is required.');
  }

  if (input.side !== 'buy' && input.side !== 'sell') {
    return validationError('The --side flag must be either "buy" or "sell".');
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return validationError('The --quantity flag must be a positive number.');
  }

  if (!Number.isFinite(input.limitPrice) || input.limitPrice <= 0) {
    return validationError('The --limit-price flag must be a positive number.');
  }

  return null;
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

const toLimitOrderRequest = ({
  resolvedInstrument,
  side,
  quantity,
  limitPrice,
  timeValidity,
}: {
  resolvedInstrument: ResolvedOrderInstrument;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  timeValidity: LimitOrderTimeValidity;
}): T212LimitOrderRequest => ({
  ticker: resolvedInstrument.ticker,
  quantity: side === 'sell' ? -quantity : quantity,
  limitPrice,
  timeValidity,
});

export { createPlaceLiveLimitOrder };
