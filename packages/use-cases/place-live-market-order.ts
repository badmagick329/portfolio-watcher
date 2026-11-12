import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  OrderExecutionAttempt,
  PlaceMarketOrderInput,
  PlaceMarketOrderResult,
  ResolvedOrderInstrument,
  T212MarketOrderRequest,
} from '@portfolio/domain';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import {
  normalizeOrderPlacementError,
  submitLiveOrder,
} from './submit-live-order';

type Params = {
  client: Pick<BrokerClient, 'placeMarketOrder'>;
  dataManager: Pick<
    BrokerDataManager,
    'getLatestInstrumentPriceByIsin' | 'saveOrderExecutionAttempt'
  >;
  resolveInstrumentForOrder: (
    instrumentInput: string,
  ) => ResultAsync<ResolvedOrderInstrument, AppError>;
  now?: () => Date;
};

type PreparedMarketOrder = {
  resolvedInstrument: ResolvedOrderInstrument;
  brokerRequest: T212MarketOrderRequest;
  baseAttempt: Omit<
    OrderExecutionAttempt,
    'executionMode' | 'brokerResponsePayload' | 'errorCode' | 'errorMessage'
  >;
  toResult: (
    executionMode: PlaceMarketOrderResult['executionMode'],
    brokerOrder: PlaceMarketOrderResult['brokerOrder'],
    auditWarning: string | null,
  ) => PlaceMarketOrderResult;
};

const createPlaceLiveMarketOrder = ({
  client,
  dataManager,
  resolveInstrumentForOrder,
  now = () => new Date(),
}: Params) => {
  const prepareMarketOrder = (
    input: PlaceMarketOrderInput,
    attemptedAt: string,
  ): ResultAsync<PreparedMarketOrder, AppError> => {
    const validationError = validatePlaceMarketOrderInput(input);

    if (validationError) {
      return errAsync(validationError);
    }

    return resolveInstrumentForOrder(input.instrument).andThen(
      (resolvedInstrument) =>
        resolveDerivedQuantity({
          input,
          resolvedInstrument,
          dataManager,
        }).map(({ derivedQuantity, referencePrice, requestedMode }): PreparedMarketOrder => {
          const extendedHours = input.extendedHours ?? false;
          const brokerRequest = toMarketOrderRequest({
            resolvedInstrument,
            side: input.side,
            derivedQuantity,
            extendedHours,
          });

          return {
            resolvedInstrument,
            brokerRequest,
            baseAttempt: {
              orderType: 'market',
              environment: 'live',
              instrumentInput: input.instrument,
              resolvedTicker: resolvedInstrument.ticker,
              resolvedIsin: resolvedInstrument.isin,
              resolvedName: resolvedInstrument.name,
              side: input.side,
              requestedMode,
              requestedQuantity: input.quantity ?? null,
              requestedValue: input.value ?? null,
              derivedQuantity,
              referencePrice,
              extendedHours,
              limitPrice: null,
              timeValidity: null,
              brokerRequestPayload: JSON.stringify(brokerRequest),
              attemptedAt,
            },
            toResult: (executionMode, brokerOrder, auditWarning) => ({
              environment: 'live',
              executionMode,
              resolvedInstrument,
              requestedMode,
              requestedQuantity: input.quantity ?? null,
              requestedValue: input.value ?? null,
              derivedQuantity,
              referencePrice,
              extendedHours,
              brokerOrder,
              auditWarning,
            }),
          };
        }),
    );
  };

  /**
   * Records an attempt that failed before reaching the broker. Broker failures
   * are recorded by `submitLiveOrder` with the full request, so they must not
   * pass through here a second time.
   */
  const recordPreparationFailure = (
    input: PlaceMarketOrderInput,
    attemptedAt: string,
    error: AppError,
  ): ResultAsync<never, AppError> => {
    const normalizedError = normalizeOrderPlacementError(error);
    const validationError = validatePlaceMarketOrderInput(input);
    if (validationError) {
      return errAsync(normalizedError);
    }

    return resolveInstrumentForOrder(input.instrument)
      .orElse(() => okAsync(null))
      .andThen((resolvedInstrument) => {
        const fallbackAttempt: OrderExecutionAttempt = {
          orderType: 'market',
          environment: 'live',
          instrumentInput: input.instrument,
          resolvedTicker: resolvedInstrument?.ticker ?? '',
          resolvedIsin: resolvedInstrument?.isin ?? '',
          resolvedName: resolvedInstrument?.name ?? '',
          side: input.side,
          requestedMode: input.quantity !== undefined ? 'quantity' : 'value',
          requestedQuantity: input.quantity ?? null,
          requestedValue: input.value ?? null,
          derivedQuantity: 0,
          referencePrice: null,
          extendedHours: input.extendedHours ?? false,
          limitPrice: null,
          timeValidity: null,
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

  return (
    input: PlaceMarketOrderInput,
  ): ResultAsync<PlaceMarketOrderResult, AppError> => {
    const attemptedAt = now().toISOString();

    return prepareMarketOrder(input, attemptedAt)
      .orElse((error) => recordPreparationFailure(input, attemptedAt, error))
      .andThen(({ brokerRequest, baseAttempt, toResult }) => {
        if (!input.confirm) {
          return dataManager
            .saveOrderExecutionAttempt({
              ...baseAttempt,
              executionMode: 'dry_run',
              brokerResponsePayload: null,
              errorCode: null,
              errorMessage: null,
            })
            .map(() => toResult('dry_run', null, null));
        }

        return submitLiveOrder({
          brokerOrder: client.placeMarketOrder(brokerRequest),
          recordAttempt: (outcome) =>
            dataManager.saveOrderExecutionAttempt({
              ...baseAttempt,
              executionMode: 'submitted',
              ...outcome,
            }),
          toResult: (brokerOrder, auditWarning) =>
            toResult('submitted', brokerOrder, auditWarning),
        });
      });
  };
};

const validatePlaceMarketOrderInput = (
  input: PlaceMarketOrderInput,
): AppError | null => {
  if (!input.instrument.trim()) {
    return {
      code: 'VALIDATION',
      message: 'The --instrument flag is required.',
    };
  }

  if (input.side !== 'buy' && input.side !== 'sell') {
    return {
      code: 'VALIDATION',
      message: 'The --side flag must be either "buy" or "sell".',
    };
  }

  const hasQuantity = input.quantity !== undefined;
  const hasValue = input.value !== undefined;

  if (hasQuantity === hasValue) {
    return {
      code: 'VALIDATION',
      message: 'Provide exactly one of --quantity or --value.',
    };
  }

  if (hasQuantity && (!Number.isFinite(input.quantity) || input.quantity! <= 0)) {
    return {
      code: 'VALIDATION',
      message: 'The --quantity flag must be a positive number.',
    };
  }

  if (hasValue && (!Number.isFinite(input.value) || input.value! <= 0)) {
    return {
      code: 'VALIDATION',
      message: 'The --value flag must be a positive number.',
    };
  }

  return null;
};

const resolveDerivedQuantity = ({
  input,
  resolvedInstrument,
  dataManager,
}: {
  input: PlaceMarketOrderInput;
  resolvedInstrument: ResolvedOrderInstrument;
  dataManager: Pick<BrokerDataManager, 'getLatestInstrumentPriceByIsin'>;
}): ResultAsync<
  {
    derivedQuantity: number;
    referencePrice: number | null;
    requestedMode: 'quantity' | 'value';
  },
  AppError
> => {
  if (input.quantity !== undefined) {
    return okAsync({
      derivedQuantity: input.quantity,
      referencePrice: null,
      requestedMode: 'quantity' as const,
    });
  }

  return dataManager
    .getLatestInstrumentPriceByIsin(resolvedInstrument.isin)
    .andThen((priceSnapshot) => {
      if (!priceSnapshot) {
        return errAsync(
          validationError(
            `No stored price is available for ${resolvedInstrument.ticker}, so --value cannot be converted to a quantity.`,
          ),
        );
      }

      if (priceSnapshot.price <= 0) {
        return errAsync(
          validationError(
            `Stored price for ${resolvedInstrument.ticker} is not usable for --value conversion.`,
          ),
        );
      }

      return okAsync({
        derivedQuantity: input.value! / priceSnapshot.price,
        referencePrice: priceSnapshot.price,
        requestedMode: 'value' as const,
      });
    });
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

const toMarketOrderRequest = ({
  resolvedInstrument,
  side,
  derivedQuantity,
  extendedHours,
}: {
  resolvedInstrument: ResolvedOrderInstrument;
  side: 'buy' | 'sell';
  derivedQuantity: number;
  extendedHours: boolean;
}): T212MarketOrderRequest => ({
  ticker: resolvedInstrument.ticker,
  quantity: side === 'sell' ? -derivedQuantity : derivedQuantity,
  extendedHours,
});

export { createPlaceLiveMarketOrder };
