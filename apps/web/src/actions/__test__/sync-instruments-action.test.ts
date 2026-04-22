import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncT212InstrumentCatalogMock = vi.fn();

vi.mock('@/lib/server/composition', () => ({
  syncT212InstrumentCatalog: syncT212InstrumentCatalogMock,
}));

describe('syncInstrumentsAction', () => {
  beforeEach(() => {
    syncT212InstrumentCatalogMock.mockReset();
  });

  it('returns ok true when the sync succeeds', async () => {
    syncT212InstrumentCatalogMock.mockResolvedValue({
      isErr: () => false,
    });

    const { syncInstrumentsAction } = await import(
      '@/actions/sync-instruments-action'
    );

    await expect(syncInstrumentsAction()).resolves.toEqual({
      ok: true,
      kind: 'instruments',
      message: 'Instruments synced.',
    });
  });

  it('returns ok false when the sync fails', async () => {
    syncT212InstrumentCatalogMock.mockResolvedValue({
      isErr: () => true,
      error: { code: 'FORBIDDEN', message: 'forbidden' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { syncInstrumentsAction } = await import(
      '@/actions/sync-instruments-action'
    );

    await expect(syncInstrumentsAction()).resolves.toEqual({
      ok: false,
      kind: 'instruments',
      message: 'Trading 212 rejected this request. Check API permissions.',
    });

    warnSpy.mockRestore();
  });
});
