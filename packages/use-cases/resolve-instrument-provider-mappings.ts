import type {
  AppError,
  BrokerDataManager,
  CategorizedInstrument,
  CurrentPositionSnapshot,
  InstrumentProviderResolutionCandidate,
  InstrumentProviderResolutionStatus,
  InstrumentProviderResolutionState,
  InstrumentRiskClient,
  InstrumentRiskProvider,
  InstrumentRiskSearchCandidate,
  ResolveInstrumentProviderMappingsResult,
} from '@portfolio/domain';
import { ResultAsync, errAsync } from 'neverthrow';
import { validationError } from './instrument-category-helpers';

const CANDIDATE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UNRESOLVED_COOLDOWN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Input = {
  force?: boolean;
  isins?: string[];
  provider?: InstrumentRiskProvider;
};

type Params = {
  client: InstrumentRiskClient;
  dataManager: Pick<
    BrokerDataManager,
    | 'getLatestCurrentPortfolioPositionSnapshotByIsin'
    | 'listCategorizedInstruments'
    | 'listInstrumentProviderResolutionCandidates'
    | 'listInstrumentProviderResolutionStatuses'
    | 'replaceInstrumentProviderResolutionCandidates'
    | 'saveInstrumentProviderResolutionStatus'
    | 'setInstrumentProviderSymbol'
  >;
  now?: () => Date;
};

const createResolveInstrumentProviderMappings = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => {
  const resolveInstrumentProviderMappings = (
    input: Input = {},
  ): ResultAsync<ResolveInstrumentProviderMappingsResult, AppError> => {
    const provider = input.provider ?? 'fmp';

    if (provider !== 'fmp') {
      return errAsync(validationError('Only the fmp provider is supported.'));
    }

    return ResultAsync.fromPromise(
      runResolution({
        client,
        dataManager,
        fetchedAt: now().toISOString(),
        input: {
          force: input.force ?? false,
          isins: input.isins,
          provider,
        },
      }),
      (error): AppError =>
        error instanceof AppErrorException
          ? error.appError
          : {
              code: 'DATABASE',
              message:
                error instanceof Error
                  ? error.message
                  : `Failed to resolve instrument provider mappings: ${String(error)}`,
            },
    );
  };

  return resolveInstrumentProviderMappings;
};

class AppErrorException extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message);
  }
}

async function runResolution({
  client,
  dataManager,
  fetchedAt,
  input,
}: {
  client: InstrumentRiskClient;
  dataManager: Params['dataManager'];
  fetchedAt: string;
  input: Required<Pick<Input, 'force' | 'provider'>> & Omit<Input, 'force' | 'provider'>;
}): Promise<ResolveInstrumentProviderMappingsResult> {
  const [instrumentsResult, statusesResult, candidatesResult] = await Promise.all([
    dataManager.listCategorizedInstruments(),
    dataManager.listInstrumentProviderResolutionStatuses(input.provider),
    dataManager.listInstrumentProviderResolutionCandidates(input.provider),
  ]);

  if (instrumentsResult.isErr()) {
    throw new AppErrorException(instrumentsResult.error);
  }

  if (statusesResult.isErr()) {
    throw new AppErrorException(statusesResult.error);
  }

  if (candidatesResult.isErr()) {
    throw new AppErrorException(candidatesResult.error);
  }

  const statusesByIsin = new Map(
    statusesResult.value.map((status) => [status.isin, status]),
  );
  const candidatesByIsin = groupCandidatesByIsin(candidatesResult.value);
  const targets = await sortTargets({
    dataManager,
    force: input.force,
    instruments: instrumentsResult.value,
    isins: input.isins,
    statusesByIsin,
  });
  const summary: ResolveInstrumentProviderMappingsResult = {
    processed: 0,
    resolved: 0,
    ambiguous: 0,
    unresolved: 0,
    failed: 0,
    skippedFresh: 0,
    skippedCooldown: 0,
    rateLimited: false,
  };

  for (const instrument of targets) {
    const status = statusesByIsin.get(instrument.isin);
    const cachedCandidates = candidatesByIsin.get(instrument.isin) ?? [];

    if (!input.force && hasFreshCandidates(cachedCandidates, fetchedAt)) {
      summary.skippedFresh++;
      continue;
    }

    if (
      !input.force &&
      status?.status === 'unresolved' &&
      !!status.fetchedAt &&
      isRecent(status.fetchedAt, fetchedAt, UNRESOLVED_COOLDOWN_TTL_MS)
    ) {
      summary.skippedCooldown++;
      continue;
    }

    summary.processed++;

    const searchCandidatesResult =
      await client.searchInstrumentRiskCandidatesByIsin(instrument.isin);

    if (searchCandidatesResult.isErr()) {
      const error = searchCandidatesResult.error;

      if (error.code === 'RATE_LIMIT') {
        summary.rateLimited = true;
        await saveRateLimitedStatus({
          dataManager,
          fetchedAt,
          instrument,
          provider: input.provider,
          message: error.message,
        });
        break;
      }

      summary.failed++;
      await saveErrorStatus({
        dataManager,
        fetchedAt,
        instrument,
        provider: input.provider,
        error,
      });
      continue;
    }

    let storedCandidates = buildStoredCandidates({
      fetchedAt,
      instrument,
      provider: input.provider,
      searchCandidates: searchCandidatesResult.value,
    });

    storedCandidates = await enrichCandidatesWithMarketMetadata({
      client,
      fetchedAt,
      instrument,
      candidates: storedCandidates,
    });

    const replaceCandidatesResult =
      await dataManager.replaceInstrumentProviderResolutionCandidates({
        isin: instrument.isin,
        provider: input.provider,
        candidates: storedCandidates.map((candidate) => ({
          candidateSymbol: candidate.candidateSymbol,
          candidateName: candidate.candidateName,
          candidateIsin: candidate.candidateIsin,
          marketCap: candidate.marketCap,
          score: candidate.score,
          evidence: candidate.evidence,
          fetchedAt: candidate.fetchedAt,
        })),
      });

    if (replaceCandidatesResult.isErr()) {
      throw new AppErrorException(replaceCandidatesResult.error);
    }

    const decision = pickResolutionDecision(instrument, storedCandidates);

    if (decision.status === 'resolved' && decision.resolvedSymbol) {
      const setMappingResult = await dataManager.setInstrumentProviderSymbol({
        isin: instrument.isin,
        provider: input.provider,
        providerSymbol: decision.resolvedSymbol,
      });

      if (setMappingResult.isErr()) {
        throw new AppErrorException(setMappingResult.error);
      }
    }

    const saveStatusResult = await dataManager.saveInstrumentProviderResolutionStatus(
      {
        isin: instrument.isin,
        provider: input.provider,
        status: decision.status,
        resolvedSymbol: decision.resolvedSymbol,
        resolutionMethod: decision.resolutionMethod,
        confidence: decision.confidence,
        message: decision.message,
        evidence: decision.evidence,
        fetchedAt,
        noCandidates: decision.noCandidates,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    );

    if (saveStatusResult.isErr()) {
      throw new AppErrorException(saveStatusResult.error);
    }

    if (decision.status === 'resolved') {
      summary.resolved++;
    } else if (decision.status === 'ambiguous') {
      summary.ambiguous++;
    } else {
      summary.unresolved++;
    }
  }

  return summary;
}

async function sortTargets({
  dataManager,
  force,
  instruments,
  isins,
  statusesByIsin,
}: {
  dataManager: Params['dataManager'];
  force: boolean;
  instruments: CategorizedInstrument[];
  isins?: string[];
  statusesByIsin: Map<string, InstrumentProviderResolutionStatus>;
}) {
  const targetSet = isins && isins.length > 0 ? new Set(isins) : null;
  const filtered = instruments.filter((instrument) => {
    if (targetSet) {
      return targetSet.has(instrument.isin);
    }

    const status = statusesByIsin.get(instrument.isin);

    if (status?.status === 'resolved') {
      return false;
    }

    return true;
  });
  const snapshots = await Promise.all(
    filtered.map(async (instrument) => {
      const snapshotResult =
        await dataManager.getLatestCurrentPortfolioPositionSnapshotByIsin(
          instrument.isin,
        );

      if (snapshotResult.isErr()) {
        throw new AppErrorException(snapshotResult.error);
      }

      return {
        instrument,
        snapshot: snapshotResult.value,
      };
    }),
  );

  return snapshots
    .sort((left, right) => comparePriority(left.snapshot, right.snapshot))
    .map((item) => item.instrument);
}

function buildStoredCandidates({
  fetchedAt,
  instrument,
  provider,
  searchCandidates,
}: {
  fetchedAt: string;
  instrument: CategorizedInstrument;
  provider: InstrumentRiskProvider;
  searchCandidates: InstrumentRiskSearchCandidate[];
}) {
  return searchCandidates
    .map((searchCandidate) =>
      toStoredCandidate({
        fetchedAt,
        instrument,
        provider,
        searchCandidate,
      }),
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftMarketCap = left.marketCap ?? Number.NEGATIVE_INFINITY;
      const rightMarketCap = right.marketCap ?? Number.NEGATIVE_INFINITY;

      if (leftMarketCap !== rightMarketCap) {
        return rightMarketCap - leftMarketCap;
      }

      return left.candidateSymbol.localeCompare(right.candidateSymbol);
    });
}

function toStoredCandidate({
  fetchedAt,
  instrument,
  provider,
  searchCandidate,
}: {
  fetchedAt: string;
  instrument: CategorizedInstrument;
  provider: InstrumentRiskProvider;
  searchCandidate: InstrumentRiskSearchCandidate;
}): InstrumentProviderResolutionCandidate {
  const searchIsinExact = isExactIsinMatch(searchCandidate.isin, instrument.isin);
  const observedSymbolMatches =
    normalizeSymbolToken(searchCandidate.symbol) ===
    normalizeSymbolToken(instrument.ticker.split('_')[0] ?? instrument.ticker);
  const exactNameMatch =
    normalizeName(searchCandidate.name) === normalizeName(instrument.name);
  const partialNameMatch =
    !exactNameMatch &&
    normalizeName(searchCandidate.name).length > 0 &&
    (normalizeName(instrument.name).includes(normalizeName(searchCandidate.name)) ||
      normalizeName(searchCandidate.name).includes(normalizeName(instrument.name)));
  let score = 0;

  if (searchIsinExact) {
    score += 100;
  }

  if (observedSymbolMatches) {
    score += 20;
  }

  if (exactNameMatch) {
    score += 10;
  } else if (partialNameMatch) {
    score += 5;
  }

  return {
    isin: instrument.isin,
    provider,
    candidateSymbol: searchCandidate.symbol,
    candidateName: searchCandidate.name,
    candidateIsin: searchCandidate.isin,
    marketCap: searchCandidate.marketCap,
    score,
    evidence: JSON.stringify({
      exactNameMatch,
      observedSymbolMatches,
      partialNameMatch,
      searchIsinExact,
      market: null,
      marketCode: null,
    }),
    fetchedAt,
  };
}

async function enrichCandidatesWithMarketMetadata({
  client,
  fetchedAt,
  instrument,
  candidates,
}: {
  client: InstrumentRiskClient;
  fetchedAt: string;
  instrument: CategorizedInstrument;
  candidates: InstrumentProviderResolutionCandidate[];
}) {
  const exactIsinCandidates = candidates.filter((candidate) =>
    isExactIsinMatch(candidate.candidateIsin, instrument.isin),
  );

  if (exactIsinCandidates.length <= 1) {
    return candidates;
  }

  const metadataBySymbol = new Map<
    string,
    { market: string | null; marketCode: string | null }
  >();

  for (const candidate of exactIsinCandidates) {
    const profileResult = await client.fetchInstrumentRiskProfile(
      candidate.candidateSymbol,
    );

    if (profileResult.isErr()) {
      if (profileResult.error.code === 'RATE_LIMIT') {
        throw new AppErrorException(profileResult.error);
      }

      continue;
    }

    metadataBySymbol.set(candidate.candidateSymbol, {
      market: profileResult.value.exchangeFullName,
      marketCode: profileResult.value.exchange,
    });
  }

  return candidates.map((candidate) => {
    const marketMetadata = metadataBySymbol.get(candidate.candidateSymbol);

    if (!marketMetadata) {
      return candidate;
    }

    const existingEvidence = parseStoredCandidateEvidence(candidate.evidence);

    return {
      ...candidate,
      evidence: JSON.stringify({
        ...existingEvidence,
        market: marketMetadata.market,
        marketCode: marketMetadata.marketCode,
      }),
      fetchedAt,
    };
  });
}

function pickResolutionDecision(
  instrument: CategorizedInstrument,
  candidates: InstrumentProviderResolutionCandidate[],
): {
  status: InstrumentProviderResolutionState;
  resolvedSymbol: string | null;
  resolutionMethod: 'auto_isin_exact' | null;
  confidence: 'high' | null;
  message: string | null;
  evidence: string | null;
  noCandidates: boolean;
} {
  if (candidates.length === 0) {
    return {
      status: 'unresolved',
      resolvedSymbol: null,
      resolutionMethod: null,
      confidence: null,
      message: `FMP search-isin returned no candidates for ${instrument.isin}.`,
      evidence: null,
      noCandidates: true,
    };
  }

  const exactIsinCandidates = candidates.filter((candidate) =>
    isExactIsinMatch(candidate.candidateIsin, instrument.isin),
  );

  if (exactIsinCandidates.length === 1) {
    return {
      status: 'resolved',
      resolvedSymbol: exactIsinCandidates[0]?.candidateSymbol ?? null,
      resolutionMethod: 'auto_isin_exact',
      confidence: 'high',
      message: null,
      evidence: JSON.stringify({
        candidateSymbol: exactIsinCandidates[0]?.candidateSymbol ?? null,
        strategy: 'single_exact_isin_match',
      }),
      noCandidates: false,
    };
  }

  if (exactIsinCandidates.length > 1) {
    const observedMatches = exactIsinCandidates.filter((candidate) =>
      parseCandidateEvidence(candidate.evidence).observedSymbolMatches,
    );
    const normalizedNames = new Set(
      exactIsinCandidates.map((candidate) => normalizeName(candidate.candidateName)),
    );

    if (observedMatches.length === 1 && normalizedNames.size === 1) {
      return {
        status: 'resolved',
        resolvedSymbol: observedMatches[0]?.candidateSymbol ?? null,
        resolutionMethod: 'auto_isin_exact',
        confidence: 'high',
        message: null,
        evidence: JSON.stringify({
          candidateSymbol: observedMatches[0]?.candidateSymbol ?? null,
          strategy: 'observed_symbol_tiebreak',
        }),
        noCandidates: false,
      };
    }

    return {
      status: 'ambiguous',
      resolvedSymbol: null,
      resolutionMethod: null,
      confidence: null,
      message: `Multiple FMP candidates matched ${instrument.isin}.`,
      evidence: JSON.stringify({
        candidateSymbols: exactIsinCandidates.map(
          (candidate) => candidate.candidateSymbol,
        ),
      }),
      noCandidates: false,
    };
  }

  return {
    status: 'unresolved',
    resolvedSymbol: null,
    resolutionMethod: null,
    confidence: null,
    message: `FMP search-isin returned candidates, but none matched ${instrument.isin} exactly.`,
    evidence: JSON.stringify({
      candidateSymbols: candidates.map((candidate) => candidate.candidateSymbol),
    }),
    noCandidates: false,
  };
}

async function saveErrorStatus({
  dataManager,
  fetchedAt,
  instrument,
  provider,
  error,
}: {
  dataManager: Params['dataManager'];
  fetchedAt: string;
  instrument: CategorizedInstrument;
  provider: InstrumentRiskProvider;
  error: AppError;
}) {
  if ((await dataManager.saveInstrumentProviderResolutionStatus({
    isin: instrument.isin,
    provider,
    status: 'unresolved',
    resolvedSymbol: null,
    resolutionMethod: null,
    confidence: null,
    message: `FMP candidate refresh failed for ${instrument.isin}.`,
    evidence: null,
    fetchedAt,
    noCandidates: false,
    lastErrorCode: error.code,
    lastErrorMessage: error.message,
  })).isErr()) {
    throw new AppErrorException({
      code: 'DATABASE',
      message: 'Failed to save resolution error status.',
    });
  }
}

async function saveRateLimitedStatus({
  dataManager,
  fetchedAt,
  instrument,
  provider,
  message,
}: {
  dataManager: Params['dataManager'];
  fetchedAt: string;
  instrument: CategorizedInstrument;
  provider: InstrumentRiskProvider;
  message: string;
}) {
  if ((await dataManager.saveInstrumentProviderResolutionStatus({
    isin: instrument.isin,
    provider,
    status: 'unresolved',
    resolvedSymbol: null,
    resolutionMethod: null,
    confidence: null,
    message: 'FMP rate limit hit while refreshing suggestions.',
    evidence: null,
    fetchedAt,
    noCandidates: false,
    lastErrorCode: 'RATE_LIMIT',
    lastErrorMessage: message,
  })).isErr()) {
    throw new AppErrorException({
      code: 'DATABASE',
      message: 'Failed to save rate limit resolution status.',
    });
  }
}

function hasFreshCandidates(
  candidates: InstrumentProviderResolutionCandidate[],
  fetchedAt: string,
) {
  const latestFetchedAt = candidates[0]?.fetchedAt;
  return latestFetchedAt
    ? isRecent(latestFetchedAt, fetchedAt, CANDIDATE_CACHE_TTL_MS)
    : false;
}

function isRecent(checkedAt: string, nowIso: string, ttlMs: number) {
  const checkedMs = Date.parse(checkedAt);
  const nowMs = Date.parse(nowIso);

  if (!Number.isFinite(checkedMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  return nowMs - checkedMs < ttlMs;
}

function parseCandidateEvidence(evidence: string | null) {
  const parsed = parseStoredCandidateEvidence(evidence);
  return {
    observedSymbolMatches: parsed.observedSymbolMatches,
  };
}

function parseStoredCandidateEvidence(evidence: string | null) {
  if (!evidence) {
    return {
      exactNameMatch: false,
      observedSymbolMatches: false,
      partialNameMatch: false,
      searchIsinExact: false,
      market: null as string | null,
      marketCode: null as string | null,
    };
  }

  try {
    const parsed = JSON.parse(evidence);
    return {
      exactNameMatch:
        typeof parsed.exactNameMatch === 'boolean'
          ? parsed.exactNameMatch
          : false,
      observedSymbolMatches:
        typeof parsed.observedSymbolMatches === 'boolean'
          ? parsed.observedSymbolMatches
          : false,
      partialNameMatch:
        typeof parsed.partialNameMatch === 'boolean'
          ? parsed.partialNameMatch
          : false,
      searchIsinExact:
        typeof parsed.searchIsinExact === 'boolean'
          ? parsed.searchIsinExact
          : false,
      market: typeof parsed.market === 'string' ? parsed.market : null,
      marketCode:
        typeof parsed.marketCode === 'string' ? parsed.marketCode : null,
    };
  } catch {
    return {
      exactNameMatch: false,
      observedSymbolMatches: false,
      partialNameMatch: false,
      searchIsinExact: false,
      market: null as string | null,
      marketCode: null as string | null,
    };
  }
}

function groupCandidatesByIsin(
  candidates: InstrumentProviderResolutionCandidate[],
) {
  const grouped = new Map<string, InstrumentProviderResolutionCandidate[]>();

  candidates.forEach((candidate) => {
    const current = grouped.get(candidate.isin) ?? [];
    current.push(candidate);
    grouped.set(candidate.isin, current);
  });

  return grouped;
}

function comparePriority(
  left: CurrentPositionSnapshot | undefined,
  right: CurrentPositionSnapshot | undefined,
) {
  const leftHeld = (left?.quantity ?? 0) > 0;
  const rightHeld = (right?.quantity ?? 0) > 0;

  if (leftHeld !== rightHeld) {
    return leftHeld ? -1 : 1;
  }

  const leftValue = left?.currentValue ?? 0;
  const rightValue = right?.currentValue ?? 0;

  if (leftValue !== rightValue) {
    return rightValue - leftValue;
  }

  return 0;
}

function isExactIsinMatch(value: string | null, expected: string) {
  return value?.trim().toUpperCase() === expected.trim().toUpperCase();
}

function normalizeSymbolToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeName(value: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export { createResolveInstrumentProviderMappings };
