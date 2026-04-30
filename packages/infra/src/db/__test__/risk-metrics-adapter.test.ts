import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, test } from 'vitest';

describe('risk metric db adapter', () => {
  test('sets, updates, lists, and unsets provider symbols', async () => {
    const dataManager = await createTestDataManager();

    await dataManager
      .setInstrumentProviderSymbol({
        isin: 'GB00BH4HKS39',
        provider: 'fmp',
        providerSymbol: 'VOD.L',
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    await dataManager
      .setInstrumentProviderSymbol({
        isin: 'GB00BH4HKS39',
        provider: 'fmp',
        providerSymbol: 'VOD.LSE',
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    const listed = await dataManager.listInstrumentProviderSymbols('fmp');

    expect(listed.isOk()).toBe(true);
    if (listed.isOk()) {
      expect(listed.value).toEqual([
        expect.objectContaining({
          isin: 'GB00BH4HKS39',
          provider: 'fmp',
          providerSymbol: 'VOD.LSE',
        }),
      ]);
    }

    await dataManager
      .unsetInstrumentProviderSymbol('GB00BH4HKS39', 'fmp')
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    const afterUnset = await dataManager.getInstrumentProviderSymbol(
      'GB00BH4HKS39',
      'fmp',
    );

    expect(afterUnset.isOk()).toBe(true);
    if (afterUnset.isOk()) {
      expect(afterUnset.value).toBeUndefined();
    }
  });

  test('saves and reads latest risk metric', async () => {
    const dataManager = await createTestDataManager();

    await dataManager
      .saveInstrumentRiskMetricSnapshot({
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
        beta: 1.1,
        sourceType: 'profile',
        asOf: '2026-04-16T10:00:00.000Z',
        fetchedAt: '2026-04-16T10:00:00.000Z',
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    await dataManager
      .saveInstrumentRiskMetricSnapshot({
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
        beta: 1.3,
        sourceType: 'profile',
        asOf: '2026-04-17T10:00:00.000Z',
        fetchedAt: '2026-04-17T10:00:00.000Z',
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    const latest = await dataManager.getLatestInstrumentRiskMetricByIsin(
      'US0378331005',
      'fmp',
    );

    expect(latest.isOk()).toBe(true);
    if (latest.isOk()) {
      expect(latest.value).toEqual({
        isin: 'US0378331005',
        provider: 'fmp',
        providerSymbol: 'AAPL',
        beta: 1.3,
        sourceType: 'profile',
        asOf: '2026-04-17T10:00:00.000Z',
        fetchedAt: '2026-04-17T10:00:00.000Z',
      });
    }
  });

  test('upserts and reads missing-beta sync status', async () => {
    const dataManager = await createTestDataManager();

    await dataManager
      .saveInstrumentRiskMetricSyncStatus({
        isin: 'IE00B8GKDB10',
        provider: 'fmp',
        providerSymbol: 'VHYL.L',
        status: 'missing_beta',
        checkedAt: '2026-04-16T10:00:00.000Z',
        message: 'missing',
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    await dataManager
      .saveInstrumentRiskMetricSyncStatus({
        isin: 'IE00B8GKDB10',
        provider: 'fmp',
        providerSymbol: 'VHYL.L',
        status: 'missing_beta',
        checkedAt: '2026-04-17T10:00:00.000Z',
        message: null,
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    const result = await dataManager.getInstrumentRiskMetricSyncStatus({
      isin: 'IE00B8GKDB10',
      provider: 'fmp',
      providerSymbol: 'VHYL.L',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        isin: 'IE00B8GKDB10',
        provider: 'fmp',
        providerSymbol: 'VHYL.L',
        status: 'missing_beta',
        checkedAt: '2026-04-17T10:00:00.000Z',
        message: null,
      });
    }
  });

  test('replaces candidate cache and reads resolution status', async () => {
    const dataManager = await createTestDataManager();

    await dataManager
      .replaceInstrumentProviderResolutionCandidates({
        isin: 'IE00B52SF786',
        provider: 'fmp',
        candidates: [
          {
            candidateSymbol: 'CSCA.L',
            candidateName: 'iShares MSCI Canada UCITS ETF',
            candidateIsin: 'IE00B52SF786',
            marketCap: 100,
            score: 145,
            evidence: '{"profileIsin":"IE00B52SF786"}',
            fetchedAt: '2026-04-29T10:00:00.000Z',
          },
        ],
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    await dataManager
      .saveInstrumentProviderResolutionStatus({
        isin: 'IE00B52SF786',
        provider: 'fmp',
        status: 'resolved',
        resolvedSymbol: 'CSCA.L',
        resolutionMethod: 'auto_isin_exact',
        confidence: 'high',
        message: null,
        evidence: '{"score":145}',
        fetchedAt: '2026-04-29T10:00:00.000Z',
        noCandidates: false,
        lastErrorCode: null,
        lastErrorMessage: null,
      })
      .match(
        () => undefined,
        (error) => {
          throw new Error(error.message);
        },
      );

    const candidates = await dataManager.listInstrumentProviderResolutionCandidates(
      'fmp',
    );
    const status = await dataManager.getInstrumentProviderResolutionStatus(
      'IE00B52SF786',
      'fmp',
    );

    expect(candidates.isOk()).toBe(true);
    if (candidates.isOk()) {
      expect(candidates.value).toEqual([
        {
          isin: 'IE00B52SF786',
          provider: 'fmp',
          candidateSymbol: 'CSCA.L',
          candidateName: 'iShares MSCI Canada UCITS ETF',
          candidateIsin: 'IE00B52SF786',
          marketCap: 100,
          score: 145,
          evidence: '{"profileIsin":"IE00B52SF786"}',
          fetchedAt: '2026-04-29T10:00:00.000Z',
        },
      ]);
    }

    expect(status.isOk()).toBe(true);
    if (status.isOk()) {
      expect(status.value).toEqual(
        expect.objectContaining({
          isin: 'IE00B52SF786',
          provider: 'fmp',
          status: 'resolved',
          resolvedSymbol: 'CSCA.L',
          resolutionMethod: 'auto_isin_exact',
          confidence: 'high',
          message: null,
          evidence: '{"score":145}',
          fetchedAt: '2026-04-29T10:00:00.000Z',
          noCandidates: false,
          lastErrorCode: null,
          lastErrorMessage: null,
        }),
      );
    }
  });
});

async function createTestDataManager() {
  const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-risk-metrics-'));
  const dbPath = path.join(dir, 'test.sqlite');
  process.env.SQLITE_DB = dbPath;
  const sqlite = new Database(dbPath);
  sqlite.exec(`
    create table instrument_provider_symbols (
      isin text not null,
      provider text not null,
      provider_symbol text not null,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create unique index instrument_provider_symbols_unique_provider_isin_idx
      on instrument_provider_symbols(provider, isin);

    create table instrument_provider_resolution_status (
      isin text not null,
      provider text not null,
      status text not null,
      resolved_symbol text,
      resolution_method text,
      confidence text,
      message text,
      evidence text,
      updated_at text not null default CURRENT_TIMESTAMP
    );
    create unique index instrument_provider_resolution_status_unique_idx
      on instrument_provider_resolution_status(provider, isin);

    create table instrument_provider_resolution_candidates (
      isin text not null,
      provider text not null,
      candidate_symbol text not null,
      candidate_name text,
      candidate_isin text,
      market_cap real,
      score integer not null,
      evidence text,
      fetched_at text not null
    );
    create unique index instrument_provider_resolution_candidates_unique_idx
      on instrument_provider_resolution_candidates(provider, isin, candidate_symbol);

    create table instrument_risk_metrics (
      id integer primary key autoincrement,
      isin text not null,
      provider text not null,
      provider_symbol text not null,
      beta real not null,
      source_type text not null,
      as_of text not null,
      fetched_at text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );
    create unique index instrument_risk_metrics_unique_snapshot_idx
      on instrument_risk_metrics(provider, isin, as_of);

    create table instrument_risk_metric_sync_status (
      isin text not null,
      provider text not null,
      provider_symbol text not null,
      status text not null,
      checked_at text not null,
      message text
    );
    create unique index instrument_risk_metric_sync_status_unique_symbol_idx
      on instrument_risk_metric_sync_status(provider, isin, provider_symbol);
  `);

  const { createBrokerDataManager } = await import('../index');
  return createBrokerDataManager(drizzle(sqlite));
}
