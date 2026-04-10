import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncPortfolioStateMock = vi.fn();

vi.mock('@/lib/server/composition', () => ({
  syncPortfolioState: syncPortfolioStateMock,
}));

describe('syncPortfolioStateAction', () => {
  beforeEach(() => {
    syncPortfolioStateMock.mockReset();
  });

  it('returns ok true when the sync succeeds', async () => {
    syncPortfolioStateMock.mockResolvedValue({
      isErr: () => false,
    });

    const { syncPortfolioStateAction } = await import(
      '@/actions/portfolio-state-action'
    );

    await expect(syncPortfolioStateAction()).resolves.toEqual({
      ok: true,
      kind: 'portfolio-state',
      message: 'Portfolio state synced.',
    });
  });

  it('returns ok false when the sync fails', async () => {
    syncPortfolioStateMock.mockResolvedValue({
      isErr: () => true,
      error: { message: 'rate limited' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { syncPortfolioStateAction } = await import(
      '@/actions/portfolio-state-action'
    );

    await expect(syncPortfolioStateAction()).resolves.toEqual({
      ok: false,
      kind: 'portfolio-state',
      message: 'Portfolio state sync failed.',
    });

    warnSpy.mockRestore();
  });
});
