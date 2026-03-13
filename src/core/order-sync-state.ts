import type { AppError, RateLimitResponse } from '@/types';
import type { ResultAsync } from 'neverthrow';

type OrderSyncState = {
  backfillNextPagePath: string | null;
  backfillCompleted: boolean;
} & RateLimitResponse;

interface OrderSyncStateManager {
  setState({
    backfillNextPagePath,
    backfillCompleted,
    rateLimitLimit,
    rateLimitPeriodSec,
    rateLimitRemaining,
    rateLimitResetEpoch,
    rateLimitUsed,
  }: OrderSyncState): ResultAsync<void, AppError>;
  getState(): ResultAsync<OrderSyncState | undefined, AppError>;
}

export type { OrderSyncState, OrderSyncStateManager };
