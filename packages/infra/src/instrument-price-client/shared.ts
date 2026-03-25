import type {
  AppError,
  InstrumentPriceResolution,
  InstrumentPriceSource,
  ResolveInstrumentPriceByIsinInput,
} from '@portfolio/domain';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|corp|corporation|plc|holdings|group|class)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const currencyCompatible = (
  localCurrency: string,
  providerCurrency: string | null | undefined,
) => {
  if (!providerCurrency) {
    return true;
  }

  const left = localCurrency.toUpperCase();
  const right = providerCurrency.toUpperCase();

  return (
    left === right ||
    (left === 'GBX' && right === 'GBP') ||
    (left === 'GBP' && right === 'GBX')
  );
};

const scoreResolution = (
  input: ResolveInstrumentPriceByIsinInput,
  candidate: {
    isin?: string | null;
    name: string;
    currency?: string | null;
  },
) => {
  if (candidate.isin && candidate.isin !== input.isin) {
    return -1;
  }

  if (!currencyCompatible(input.currency, candidate.currency)) {
    return -1;
  }

  const normalizedInput = normalizeName(input.name);
  const normalizedCandidate = normalizeName(candidate.name);

  if (!normalizedCandidate) {
    return -1;
  }

  if (normalizedCandidate === normalizedInput) {
    return 1;
  }

  if (
    normalizedCandidate.includes(normalizedInput) ||
    normalizedInput.includes(normalizedCandidate)
  ) {
    return 0.9;
  }

  const inputWords = new Set(normalizedInput.split(' ').filter(Boolean));
  const candidateWords = normalizedCandidate.split(' ').filter(Boolean);
  const sharedWords = candidateWords.filter((word) => inputWords.has(word));
  const overlap = candidateWords.length
    ? sharedWords.length / candidateWords.length
    : 0;

  return overlap >= 0.5 ? overlap : -1;
};

const pickBestResolution = <T extends InstrumentPriceResolution>(
  input: ResolveInstrumentPriceByIsinInput,
  candidates: T[],
) => {
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreResolution(input, {
        isin: candidate.isin,
        name: candidate.resolvedName,
        currency: candidate.resolvedCurrency,
      }),
    }))
    .filter((entry) => entry.score >= 0.5)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return null;
  }

  const [best, second] = scored;
  if (best && second && best.score - second.score < 0.1) {
    return null;
  }

  return best?.candidate ?? null;
};

const fetchJson = <T>(
  endPoint: string,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { message: string } } },
) =>
  ResultAsync.fromPromise(
    fetch(endPoint),
    (e): AppError => ({
      code: 'NETWORK',
      message: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
    }),
  )
    .andThen((resp) => {
      if (resp.ok) {
        return okAsync(resp);
      }

      return errAsync({
        code: 'API',
        message: `Price provider returned ${resp.status} - ${resp.statusText} from ${resp.url}`,
      } satisfies AppError);
    })
    .andThen((resp) =>
      ResultAsync.fromPromise(
        resp.json(),
        (e): AppError => ({
          code: 'API',
          message: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
        }),
      ),
    )
    .andThen((json) => {
      const parsed = schema.safeParse(json);
      return parsed.success
        ? okAsync(parsed.data)
        : errAsync({
            code: 'API',
            message: `Invalid schema: ${parsed.error.message}`,
          } satisfies AppError);
    });

const withFetchMetadata = (
  source: InstrumentPriceSource,
  params: {
    attemptedAt: string;
    status: 'ok' | 'failed';
    error?: string | null;
    consecutiveFailures: number;
  },
): InstrumentPriceSource => ({
  ...source,
  lastFetchStatus: params.status,
  lastFetchError: params.error ?? null,
  lastFetchAttemptedAt: params.attemptedAt,
  consecutiveFailures: params.consecutiveFailures,
});

export {
  currencyCompatible,
  fetchJson,
  pickBestResolution,
  withFetchMetadata,
};
