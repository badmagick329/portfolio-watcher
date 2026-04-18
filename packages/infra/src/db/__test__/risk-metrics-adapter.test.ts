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
