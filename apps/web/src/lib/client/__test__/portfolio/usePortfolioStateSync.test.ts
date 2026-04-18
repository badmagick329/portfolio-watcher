import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncPortfolioStateActionMock = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/actions/portfolio-state-action', () => ({
  syncPortfolioStateAction: syncPortfolioStateActionMock,
}));

describe('getPortfolioStateSyncQueryOptions', () => {
  beforeEach(() => {
    syncPortfolioStateActionMock.mockReset();
  });

  it('invalidates the explorer query when sync succeeds', async () => {
    const invalidateOrdersExplorer = vi.fn().mockResolvedValue(undefined);
    const { getPortfolioStateSyncQueryOptions } = await import(
      '@/lib/client/portfolio/usePortfolioStateSync'
    );

    syncPortfolioStateActionMock.mockResolvedValue({ ok: true });

    const options = getPortfolioStateSyncQueryOptions(invalidateOrdersExplorer);

    await expect(options.queryFn()).resolves.toEqual({ ok: true });
    expect(invalidateOrdersExplorer).toHaveBeenCalledTimes(1);
    expect(options.retry).toBe(false);
  });

  it('does not invalidate the explorer query when sync fails', async () => {
    const invalidateOrdersExplorer = vi.fn().mockResolvedValue(undefined);
    const { getPortfolioStateSyncQueryOptions, PORTFOLIO_STATE_SYNC_INTERVAL_MS } =
      await import('@/lib/client/portfolio/usePortfolioStateSync');

    syncPortfolioStateActionMock.mockResolvedValue({ ok: false });

    const options = getPortfolioStateSyncQueryOptions(invalidateOrdersExplorer);

    await expect(options.queryFn()).resolves.toEqual({ ok: false });
    expect(invalidateOrdersExplorer).not.toHaveBeenCalled();
    expect(options.refetchInterval).toBe(PORTFOLIO_STATE_SYNC_INTERVAL_MS);
    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(false);
    expect(options.refetchOnMount).toBe('always');
  });
});
