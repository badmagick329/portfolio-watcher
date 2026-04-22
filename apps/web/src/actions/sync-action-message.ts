import type { AppError } from '@portfolio/domain';
import type { OrdersSyncActionKind, OrdersSyncActionResult, PortfolioStateSyncActionKind } from './sync-action-types';

const getSyncFailureMessage = (
  kind: OrdersSyncActionKind | PortfolioStateSyncActionKind,
  error: AppError,
) => {
  if (
    error.code === 'VALIDATION' &&
    error.message === 'Trading 212 API credentials are required.'
  ) {
    if (kind === 'portfolio-state') {
      return 'Add Trading 212 API credentials to sync portfolio state.';
    }

    if (kind === 'orders') {
      return 'Add Trading 212 API credentials to sync orders.';
    }

    return 'Add Trading 212 API credentials to sync instruments.';
  }

  if (error.code === 'RATE_LIMIT') {
    return 'Trading 212 rate limited this request. Try again later.';
  }

  if (error.code === 'FORBIDDEN') {
    return 'Trading 212 rejected this request. Check API permissions.';
  }

  if (kind === 'portfolio-state') {
    return 'Portfolio state sync failed.';
  }

  if (kind === 'orders') {
    return 'Orders sync failed.';
  }

  return 'Instrument sync failed.';
};

const toFailedSyncActionResult = (
  kind: OrdersSyncActionKind | PortfolioStateSyncActionKind,
  error: AppError,
): OrdersSyncActionResult => ({
  ok: false,
  kind,
  message: getSyncFailureMessage(kind, error),
});

export { toFailedSyncActionResult };
