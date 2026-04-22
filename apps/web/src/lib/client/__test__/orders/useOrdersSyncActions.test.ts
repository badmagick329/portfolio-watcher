import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncOrdersActionMock = vi.fn();
const syncInstrumentsActionMock = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/actions/sync-orders-action', () => ({
  syncOrdersAction: syncOrdersActionMock,
}));

vi.mock('@/actions/sync-instruments-action', () => ({
  syncInstrumentsAction: syncInstrumentsActionMock,
}));

describe('getOrdersSyncMutationOptions', () => {
  beforeEach(() => {
    syncOrdersActionMock.mockReset();
    syncInstrumentsActionMock.mockReset();
  });

  it('invalidates the explorer query when a sync succeeds', async () => {
    const invalidateOrdersExplorer = vi.fn().mockResolvedValue(undefined);
    const setLastResult = vi.fn();
    const { getOrdersSyncMutationOptions } = await import(
      '@/lib/client/orders/useOrdersSyncActions'
    );
    const result = {
      ok: true,
      kind: 'orders' as const,
      message: 'Orders synced.',
    };

    syncOrdersActionMock.mockResolvedValue(result);

    const options = getOrdersSyncMutationOptions({
      invalidateOrdersExplorer,
      setLastResult,
    });

    await expect(options.mutationFn('orders')).resolves.toEqual(result);
    await options.onSuccess(result);

    expect(setLastResult).toHaveBeenCalledWith(result);
    expect(invalidateOrdersExplorer).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('records the result without invalidating when a sync fails', async () => {
    const invalidateOrdersExplorer = vi.fn().mockResolvedValue(undefined);
    const setLastResult = vi.fn();
    const { getOrdersSyncMutationOptions } = await import(
      '@/lib/client/orders/useOrdersSyncActions'
    );
    const result = {
      ok: false,
      kind: 'instruments' as const,
      message: 'Instrument sync failed.',
    };

    syncInstrumentsActionMock.mockResolvedValue(result);

    const options = getOrdersSyncMutationOptions({
      invalidateOrdersExplorer,
      setLastResult,
    });

    await expect(options.mutationFn('instruments')).resolves.toEqual(result);
    await options.onSuccess(result);

    expect(setLastResult).toHaveBeenCalledWith(result);
    expect(invalidateOrdersExplorer).not.toHaveBeenCalled();
  });
});
