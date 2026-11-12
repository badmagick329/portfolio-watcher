import type { AppError, OrderExecutionAttempt } from '@portfolio/domain';
import { type ResultAsync, errAsync, okAsync } from 'neverthrow';

type AttemptOutcome = Pick<
  OrderExecutionAttempt,
  'brokerResponsePayload' | 'errorCode' | 'errorMessage'
>;

/**
 * Sends a confirmed live order and records the attempt.
 *
 * Two rules keep a user from placing the same real-money order twice:
 * - A broker failure that does not prove rejection becomes
 *   `ORDER_OUTCOME_UNKNOWN`, so it is never shown as an ordinary failure.
 * - Once the broker has accepted the order, a failed audit save is only a
 *   warning on the result. Reporting it as an error would hide a live order.
 */
const submitLiveOrder = <TOrder, TResult>({
  brokerOrder,
  recordAttempt,
  toResult,
}: {
  brokerOrder: ResultAsync<TOrder, AppError>;
  recordAttempt: (outcome: AttemptOutcome) => ResultAsync<void, AppError>;
  toResult: (brokerOrder: TOrder, auditWarning: string | null) => TResult;
}): ResultAsync<TResult, AppError> =>
  brokerOrder
    .orElse((brokerError) => {
      const error = classifyBrokerOrderError(brokerError);
      return recordAttempt({
        brokerResponsePayload: null,
        errorCode: error.code,
        errorMessage: error.message,
      })
        .orElse(() => okAsync(undefined))
        .andThen(() => errAsync(error));
    })
    .andThen((order) =>
      recordAttempt({
        brokerResponsePayload: JSON.stringify(order),
        errorCode: null,
        errorMessage: null,
      })
        .map((): string | null => null)
        .orElse((saveError) =>
          okAsync(
            `Order was placed, but its audit record was not saved: ${saveError.message}`,
          ),
        )
        .map((auditWarning) => toResult(order, auditWarning)),
    );

/**
 * Only failures that prove no order exists stay as they are: errors raised
 * before the request was sent (VALIDATION), and broker answers that refuse it
 * (403, 429, other 4xx). A network error may follow a delivered request, a 5xx
 * may follow a processed one, and an unreadable 2xx body means the broker
 * accepted the order.
 */
const classifyBrokerOrderError = (error: AppError): AppError => {
  if (
    error.code === 'VALIDATION' ||
    error.code === 'FORBIDDEN' ||
    error.code === 'RATE_LIMIT'
  ) {
    return normalizeOrderPlacementError(error);
  }

  if (error.code === 'API' && isClientErrorStatus(error.status)) {
    return error;
  }

  return {
    code: 'ORDER_OUTCOME_UNKNOWN',
    message: `Trading 212 may have placed this order; the request failed without a clear rejection (${error.code}: ${error.message}). Check open orders and order history in Trading 212 before retrying: re-running with --confirm may place a duplicate order.`,
  };
};

const isClientErrorStatus = (status: number | undefined) =>
  status !== undefined && status >= 400 && status < 500;

const normalizeOrderPlacementError = (error: AppError): AppError =>
  error.code === 'FORBIDDEN'
    ? {
        ...error,
        message: 'Broker key does not allow live order placement.',
      }
    : error;

export { normalizeOrderPlacementError, submitLiveOrder };
