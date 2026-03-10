import type { AppError } from '@/types';
import type { ResultAsync } from 'neverthrow';

type OrderSyncState = {
  backfillNextPagePath: string | null;
  backfillCompleted: boolean;
  rateLimitLimit: number;
  rateLimitPeriodSec: number;
  rateLimitRemaining: number;
  rateLimitResetEpoch: number;
};

interface OrderSyncStateManager {
  setState({
    backfillNextPagePath,
    backfillCompleted,
    rateLimitLimit,
    rateLimitPeriodSec,
    rateLimitRemaining,
    rateLimitResetEpoch,
  }: OrderSyncState): ResultAsync<void, AppError>;
  getState(): ResultAsync<OrderSyncState | undefined, AppError>;
}

export type { OrderSyncState, OrderSyncStateManager };
