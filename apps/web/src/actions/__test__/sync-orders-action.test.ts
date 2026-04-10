import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncHistoricalOrdersMock = vi.fn();

vi.mock('@/lib/server/composition', () => ({
  syncHistoricalOrders: syncHistoricalOrdersMock,
}));

describe('syncOrdersAction', () => {
  beforeEach(() => {
    syncHistoricalOrdersMock.mockReset();
  });

  it('returns ok true when the sync succeeds', async () => {
    syncHistoricalOrdersMock.mockResolvedValue({
      isErr: () => false,
    });

    const { syncOrdersAction } = await import('@/actions/sync-orders-action');

    await expect(syncOrdersAction()).resolves.toEqual({
      ok: true,
      kind: 'orders',
      message: 'Orders synced.',
    });
  });

  it('returns ok false when the sync fails', async () => {
    syncHistoricalOrdersMock.mockResolvedValue({
      isErr: () => true,
      error: { message: 'rate limited' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { syncOrdersAction } = await import('@/actions/sync-orders-action');

    await expect(syncOrdersAction()).resolves.toEqual({
      ok: false,
      kind: 'orders',
      message: 'Orders sync failed.',
    });

    warnSpy.mockRestore();
  });
});
