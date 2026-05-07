import { describe, expect, test, vi } from 'vitest';

const getMoversActionMock = vi.fn();

vi.mock('@/actions/movers-action', () => ({
  getMoversAction: getMoversActionMock,
}));

describe('movers query options', () => {
  test('keeps previous data while a new date range loads', async () => {
    const { getMoversQueryOptions } = await import('../../movers/useMoversQuery');
    const options = getMoversQueryOptions({
      filledFrom: '2026-03-01',
      filledTo: '2026-06-01',
    });

    expect(options.queryKey).toEqual([
      'movers',
      {
        filledFrom: '2026-03-01',
        filledTo: '2026-06-01',
      },
    ]);
    expect(options.placeholderData).toBeTypeOf('function');
  });
});
