import { describe, expect, test, vi } from 'vitest';
import type {
  BrokerDataManager,
  CategorizedInstrument,
  CurrentPositionSnapshot,
  InstrumentProviderResolutionCandidate,
  InstrumentProviderResolutionStatus,
  InstrumentRiskClient,
  InstrumentRiskSearchCandidate,
} from '@portfolio/domain';
import { errAsync, okAsync } from 'neverthrow';
import { createResolveInstrumentProviderMappings } from '../resolve-instrument-provider-mappings';

const nowIso = '2026-04-29T12:00:00.000Z';
const canadaEtf: CategorizedInstrument = {
  ticker: 'CSCAl_EQ',
  name: 'iShares MSCI Canada (Acc)',
  isin: 'IE00B52SF786',
  currency: 'GBX',
  category: 'index',
};

describe('resolve instrument provider mappings', () => {
  test('auto-resolves exact single-candidate ISIN match without profile calls', async () => {
    const fetchInstrumentRiskProfile = vi.fn();
    const savedStatuses: Array<Omit<InstrumentProviderResolutionStatus, 'updatedAt'>> =
      [];
    const setMappings: Array<{ isin: string; providerSymbol: string }> = [];
    const replacedCandidates: InstrumentProviderResolutionCandidate[] = [];
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: riskClient({
        candidatesByIsin: {
          IE00B52SF786: [
            searchCandidate('CSCA.L', 'iShares MSCI Canada (Acc)', 'IE00B52SF786'),
          ],
        },
        fetchInstrumentRiskProfile,
      }),
      dataManager: dataManager({
        currentSnapshotsByIsin: {},
        instruments: [canadaEtf],
        replacedCandidates,
        savedStatuses,
        setMappings,
        statuses: [],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        processed: 1,
        resolved: 1,
        ambiguous: 0,
        unresolved: 0,
        failed: 0,
        skippedFresh: 0,
        skippedCooldown: 0,
        rateLimited: false,
      });
    }
    expect(fetchInstrumentRiskProfile).not.toHaveBeenCalled();
    expect(setMappings).toEqual([
      { isin: 'IE00B52SF786', providerSymbol: 'CSCA.L' },
    ]);
    expect(savedStatuses[0]).toEqual(
      expect.objectContaining({
        status: 'resolved',
        resolvedSymbol: 'CSCA.L',
        resolutionMethod: 'auto_isin_exact',
        confidence: 'high',
        fetchedAt: nowIso,
        noCandidates: false,
      }),
    );
  });

  test('marks multiple exact-isin candidates ambiguous and enriches market metadata', async () => {
    const fetchInstrumentRiskProfile = vi
      .fn()
      .mockImplementation((symbol: string) =>
        okAsync({
          symbol,
          companyName: 'iShares MSCI Canada UCITS ETF',
          isin: 'IE00B52SF786',
          beta: 1,
          exchange:
            symbol === 'CCAU.L'
              ? 'LSE'
              : 'XETRA',
          exchangeFullName:
            symbol === 'CCAU.L'
              ? 'London Stock Exchange'
              : 'Deutsche Börse Xetra',
        }),
      );
    const replacedCandidates: InstrumentProviderResolutionCandidate[] = [];
    const savedStatuses: Array<Omit<InstrumentProviderResolutionStatus, 'updatedAt'>> =
      [];
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: riskClient({
        candidatesByIsin: {
          IE00B52SF786: [
            searchCandidate('CCAU.L', 'iShares MSCI Canada UCITS ETF', 'IE00B52SF786'),
            searchCandidate('SXR2.DE', 'iShares MSCI Canada UCITS ETF', 'IE00B52SF786'),
          ],
        },
        fetchInstrumentRiskProfile,
      }),
      dataManager: dataManager({
        currentSnapshotsByIsin: {},
        instruments: [{ ...canadaEtf, ticker: 'RANDO_EQ' }],
        replacedCandidates,
        savedStatuses,
        setMappings: [],
        statuses: [],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ambiguous).toBe(1);
    }
    expect(fetchInstrumentRiskProfile).toHaveBeenCalledTimes(2);
    expect(fetchInstrumentRiskProfile).toHaveBeenCalledWith('CCAU.L');
    expect(fetchInstrumentRiskProfile).toHaveBeenCalledWith('SXR2.DE');
    expect(savedStatuses[0]).toEqual(
      expect.objectContaining({
        status: 'ambiguous',
        fetchedAt: nowIso,
      }),
    );
    expect(
      replacedCandidates.find((candidate) => candidate.candidateSymbol === 'CCAU.L')
        ?.evidence,
    ).toContain('London Stock Exchange');
    expect(
      replacedCandidates.find((candidate) => candidate.candidateSymbol === 'SXR2.DE')
        ?.evidence,
    ).toContain('Deutsche Börse Xetra');
  });

  test('skips fresh cached candidates during bulk refresh', async () => {
    const searchInstrumentRiskCandidatesByIsin = vi.fn();
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: {
        fetchInstrumentRiskProfile: vi.fn(),
        searchInstrumentRiskCandidatesByIsin,
      },
      dataManager: dataManager({
        currentSnapshotsByIsin: {},
        instruments: [canadaEtf],
        replacedCandidates: [],
        savedStatuses: [],
        setMappings: [],
        statuses: [],
        candidates: [
          {
            isin: canadaEtf.isin,
            provider: 'fmp',
            candidateSymbol: 'CSCA.L',
            candidateName: canadaEtf.name,
            candidateIsin: canadaEtf.isin,
            marketCap: 1000,
            score: 130,
            evidence: null,
            fetchedAt: '2026-04-20T12:00:00.000Z',
          },
        ],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.skippedFresh).toBe(1);
      expect(result.value.processed).toBe(0);
    }
    expect(searchInstrumentRiskCandidatesByIsin).not.toHaveBeenCalled();
  });

  test('skips unresolved instruments on cooldown during bulk refresh', async () => {
    const searchInstrumentRiskCandidatesByIsin = vi.fn();
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: {
        fetchInstrumentRiskProfile: vi.fn(),
        searchInstrumentRiskCandidatesByIsin,
      },
      dataManager: dataManager({
        currentSnapshotsByIsin: {},
        instruments: [canadaEtf],
        replacedCandidates: [],
        savedStatuses: [],
        setMappings: [],
        statuses: [
          {
            isin: canadaEtf.isin,
            provider: 'fmp',
            status: 'unresolved',
            resolvedSymbol: null,
            resolutionMethod: null,
            confidence: null,
            message: 'FMP search-isin returned no candidates.',
            evidence: null,
            fetchedAt: '2026-04-25T12:00:00.000Z',
            noCandidates: true,
            lastErrorCode: null,
            lastErrorMessage: null,
            updatedAt: '2026-04-25T12:00:00.000Z',
          },
        ],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.skippedCooldown).toBe(1);
      expect(result.value.processed).toBe(0);
    }
    expect(searchInstrumentRiskCandidatesByIsin).not.toHaveBeenCalled();
  });

  test('stops immediately on first rate limit', async () => {
    const first: CategorizedInstrument = {
      ...canadaEtf,
      isin: 'US0378331005',
      name: 'Apple Inc.',
      ticker: 'AAPL_US_EQ',
    };
    const second: CategorizedInstrument = {
      ...canadaEtf,
      isin: 'US00724F1012',
      name: 'Adobe Inc.',
      ticker: 'ADBE_US_EQ',
    };
    const searchInstrumentRiskCandidatesByIsin = vi
      .fn()
      .mockImplementationOnce(() =>
        errAsync({
          code: 'RATE_LIMIT',
          message: 'FMP rate limited',
          rateLimitResponse: {
            rateLimitLimit: 0,
            rateLimitPeriodSec: 0,
            rateLimitRemaining: 0,
            rateLimitResetEpoch: 0,
            rateLimitUsed: 0,
          },
        }),
      );
    const savedStatuses: Array<Omit<InstrumentProviderResolutionStatus, 'updatedAt'>> =
      [];
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: {
        fetchInstrumentRiskProfile: vi.fn(),
        searchInstrumentRiskCandidatesByIsin,
      },
      dataManager: dataManager({
        currentSnapshotsByIsin: {
          [first.isin]: currentSnapshot(first.isin, 1000),
          [second.isin]: currentSnapshot(second.isin, 500),
        },
        instruments: [first, second],
        replacedCandidates: [],
        savedStatuses,
        setMappings: [],
        statuses: [],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rateLimited).toBe(true);
      expect(result.value.processed).toBe(1);
    }
    expect(searchInstrumentRiskCandidatesByIsin).toHaveBeenCalledTimes(1);
    expect(savedStatuses[0]).toEqual(
      expect.objectContaining({
        isin: first.isin,
        lastErrorCode: 'RATE_LIMIT',
      }),
    );
  });

  test('row refresh bypasses freshness cache', async () => {
    const searchInstrumentRiskCandidatesByIsin = vi.fn().mockReturnValue(
      okAsync([
        searchCandidate('CSCA.L', 'iShares MSCI Canada (Acc)', 'IE00B52SF786'),
      ]),
    );
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: {
        fetchInstrumentRiskProfile: vi.fn(),
        searchInstrumentRiskCandidatesByIsin,
      },
      dataManager: dataManager({
        currentSnapshotsByIsin: {},
        instruments: [canadaEtf],
        replacedCandidates: [],
        savedStatuses: [],
        setMappings: [],
        statuses: [],
        candidates: [
          {
            isin: canadaEtf.isin,
            provider: 'fmp',
            candidateSymbol: 'OLD.L',
            candidateName: canadaEtf.name,
            candidateIsin: canadaEtf.isin,
            marketCap: 1000,
            score: 130,
            evidence: null,
            fetchedAt: '2026-04-28T12:00:00.000Z',
          },
        ],
      }),
      now: () => new Date(nowIso),
    });

    const result = await resolveMappings({ force: true, isins: [canadaEtf.isin] });

    expect(result.isOk()).toBe(true);
    expect(searchInstrumentRiskCandidatesByIsin).toHaveBeenCalledTimes(1);
  });

  test('prioritizes current holdings by value ahead of historical-only instruments', async () => {
    const first: CategorizedInstrument = {
      ...canadaEtf,
      isin: 'US0378331005',
      name: 'Apple Inc.',
      ticker: 'AAPL_US_EQ',
    };
    const second: CategorizedInstrument = {
      ...canadaEtf,
      isin: 'US00724F1012',
      name: 'Adobe Inc.',
      ticker: 'ADBE_US_EQ',
    };
    const third: CategorizedInstrument = {
      ...canadaEtf,
      isin: 'US0084921008',
      name: 'Agree Realty',
      ticker: 'ADC_US_EQ',
    };
    const seen: string[] = [];
    const resolveMappings = createResolveInstrumentProviderMappings({
      client: {
        fetchInstrumentRiskProfile: vi.fn(),
        searchInstrumentRiskCandidatesByIsin: (isin) => {
          seen.push(isin);
          return okAsync([]);
        },
      },
      dataManager: dataManager({
        currentSnapshotsByIsin: {
          [first.isin]: currentSnapshot(first.isin, 400),
          [second.isin]: currentSnapshot(second.isin, 1200),
        },
        instruments: [first, second, third],
        replacedCandidates: [],
        savedStatuses: [],
        setMappings: [],
        statuses: [],
      }),
      now: () => new Date(nowIso),
    });

    await resolveMappings();

    expect(seen).toEqual([second.isin, first.isin, third.isin]);
  });
});

function dataManager({
  candidates = [],
  currentSnapshotsByIsin,
  instruments,
  replacedCandidates,
  savedStatuses,
  setMappings,
  statuses,
}: {
  candidates?: InstrumentProviderResolutionCandidate[];
  currentSnapshotsByIsin: Record<string, CurrentPositionSnapshot>;
  instruments: CategorizedInstrument[];
  replacedCandidates: InstrumentProviderResolutionCandidate[];
  savedStatuses: Array<Omit<InstrumentProviderResolutionStatus, 'updatedAt'>>;
  setMappings: Array<{ isin: string; providerSymbol: string }>;
  statuses: InstrumentProviderResolutionStatus[];
}): Pick<
  BrokerDataManager,
  | 'getLatestCurrentPortfolioPositionSnapshotByIsin'
  | 'listCategorizedInstruments'
  | 'listInstrumentProviderResolutionCandidates'
  | 'listInstrumentProviderResolutionStatuses'
  | 'replaceInstrumentProviderResolutionCandidates'
  | 'saveInstrumentProviderResolutionStatus'
  | 'setInstrumentProviderSymbol'
> {
  return {
    getLatestCurrentPortfolioPositionSnapshotByIsin: (isin) =>
      okAsync(currentSnapshotsByIsin[isin]),
    listCategorizedInstruments: () => okAsync(instruments),
    listInstrumentProviderResolutionCandidates: () => okAsync(candidates),
    listInstrumentProviderResolutionStatuses: () => okAsync(statuses),
    replaceInstrumentProviderResolutionCandidates: ({ isin, provider, candidates }) => {
      replacedCandidates.push(
        ...candidates.map(
          (candidate): InstrumentProviderResolutionCandidate => ({
            isin,
            provider,
            candidateSymbol: candidate.candidateSymbol,
            candidateName: candidate.candidateName,
            candidateIsin: candidate.candidateIsin,
            marketCap: candidate.marketCap,
            score: candidate.score,
            evidence: candidate.evidence,
            fetchedAt: candidate.fetchedAt,
          }),
        ),
      );
      return okAsync(undefined);
    },
    saveInstrumentProviderResolutionStatus: (status) => {
      savedStatuses.push(status);
      return okAsync(undefined);
    },
    setInstrumentProviderSymbol: ({ isin, providerSymbol }) => {
      setMappings.push({ isin, providerSymbol });
      return okAsync(undefined);
    },
  };
}

function riskClient({
  candidatesByIsin,
  fetchInstrumentRiskProfile,
}: {
  candidatesByIsin: Record<string, InstrumentRiskSearchCandidate[]>;
  fetchInstrumentRiskProfile: ReturnType<typeof vi.fn>;
}): InstrumentRiskClient {
  return {
    fetchInstrumentRiskProfile,
    searchInstrumentRiskCandidatesByIsin: (isin) =>
      okAsync(candidatesByIsin[isin] ?? []),
  };
}

function searchCandidate(
  symbol: string,
  name: string,
  isin: string | null,
): InstrumentRiskSearchCandidate {
  return {
    symbol,
    name,
    isin,
    marketCap: 1000,
  };
}

function currentSnapshot(
  isin: string,
  currentValue: number,
): CurrentPositionSnapshot {
  return {
    isin,
    providerSymbol: isin,
    quantity: 1,
    currentPrice: currentValue,
    instrumentCurrency: 'USD',
    walletCurrency: 'GBP',
    currentValue,
    totalCost: currentValue,
    unrealizedProfitLoss: 0,
    fxImpact: null,
    asOf: nowIso,
    fetchedAt: nowIso,
  };
}
