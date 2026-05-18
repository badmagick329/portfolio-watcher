'use server';

import {
  clearInstrumentProviderResolution,
  confirmInstrumentProviderResolution,
  getAppCapabilities,
  getHistoricalOrdersForWeb,
  getLatestCurrentPositionSnapshot,
  getLatestInstrumentRiskMetric,
  listCategorizedInstruments,
  listInstrumentProviderResolutionCandidates,
  listInstrumentProviderResolutionStatuses,
  listInstrumentProviderSymbols,
  listInstrumentRiskMetricSyncStatuses,
  resolveInstrumentProviderMappings,
  setInstrumentCategories,
  unsetInstrumentCategories,
} from '@/lib/server/composition';
import type { AppCapabilities } from '@portfolio/domain';
import type {
  InstrumentProviderResolutionCandidate,
  InstrumentProviderResolutionStatus,
  InstrumentProviderSymbol,
  InstrumentRiskMetricSyncStatus,
  WebHistoricalOrder,
} from '@portfolio/domain';

async function getCategoryManagementAction() {
  const [categoriesResult, ordersResult, capabilitiesResult] =
    await Promise.all([
      listCategorizedInstruments(),
      getHistoricalOrdersForWeb(),
      getAppCapabilities(),
    ]);

  if (categoriesResult.isErr()) {
    throw new Error(categoriesResult.error.message);
  }

  if (ordersResult.isErr()) {
    throw new Error(ordersResult.error.message);
  }

  if (capabilitiesResult.isErr()) {
    throw new Error(capabilitiesResult.error.message);
  }

  const quantitiesByIsin = getCurrentQuantitiesByIsin(ordersResult.value.items);

  return {
    capabilities: capabilitiesResult.value,
    instruments: categoriesResult.value.map((instrument) => {
      const currentQuantity = quantitiesByIsin.get(instrument.isin) ?? 0;

      return {
        ...instrument,
        currentQuantity,
        currentlyHeld: currentQuantity > 0,
      };
    }),
  };
}

async function getAllocationAction() {
  const [categoriesResult, ordersResult, capabilitiesResult] = await Promise.all([
    listCategorizedInstruments(),
    getHistoricalOrdersForWeb(),
    getAppCapabilities(),
  ]);

  if (categoriesResult.isErr()) {
    throw new Error(categoriesResult.error.message);
  }

  if (ordersResult.isErr()) {
    throw new Error(ordersResult.error.message);
  }

  if (capabilitiesResult.isErr()) {
    throw new Error(capabilitiesResult.error.message);
  }

  const capabilities = capabilitiesResult.value;

  if (!capabilities.riskMetricsFeatureEnabled) {
    const quantitiesByIsin = getCurrentQuantitiesByIsin(ordersResult.value.items);
    const instruments = await Promise.all(
      categoriesResult.value.map(async (instrument) => {
        const currentQuantity = quantitiesByIsin.get(instrument.isin) ?? 0;
        const snapshotResult = await getLatestCurrentPositionSnapshot(
          instrument.isin,
        );

        if (snapshotResult.isErr()) {
          throw new Error(snapshotResult.error.message);
        }

        return {
          ...instrument,
          currentPositionSnapshot: snapshotResult.value ?? null,
          currentQuantity,
          currentlyHeld: currentQuantity > 0,
          riskMetric: null,
        };
      }),
    );

    return {
      capabilities,
      historicalOrders: ordersResult.value.items,
      instruments,
      riskMappingSummary: {
        unresolvedCurrentHoldingsCount: 0,
      },
    };
  }

  const providerSymbolsResult = await listInstrumentProviderSymbols('fmp');

  if (providerSymbolsResult.isErr()) {
    throw new Error(providerSymbolsResult.error.message);
  }

  const quantitiesByIsin = getCurrentQuantitiesByIsin(ordersResult.value.items);
  const providerSymbolsByIsin = new Map(
    providerSymbolsResult.value.map((item) => [item.isin, item]),
  );

  const instruments = await Promise.all(
    categoriesResult.value.map(async (instrument) => {
      const currentQuantity = quantitiesByIsin.get(instrument.isin) ?? 0;
      const snapshotResult = await getLatestCurrentPositionSnapshot(
        instrument.isin,
      );
      const riskMetricResult = await getLatestInstrumentRiskMetric(
        instrument.isin,
        'fmp',
      );

      if (snapshotResult.isErr()) {
        throw new Error(snapshotResult.error.message);
      }

      if (riskMetricResult.isErr()) {
        throw new Error(riskMetricResult.error.message);
      }

      return {
        ...instrument,
        currentPositionSnapshot: snapshotResult.value ?? null,
        currentQuantity,
        currentlyHeld: currentQuantity > 0,
        riskMetric: riskMetricResult.value ?? null,
      };
    }),
  );

  return {
    capabilities,
    historicalOrders: ordersResult.value.items,
    instruments,
    riskMappingSummary: {
      unresolvedCurrentHoldingsCount: instruments.filter(
        (instrument) =>
          instrument.currentlyHeld && !providerSymbolsByIsin.has(instrument.isin),
      ).length,
    },
  };
}

async function getRiskMappingsAction() {
  const capabilities = await requireRiskMetricsFeatureEnabled();
  const [
    categoriesResult,
    ordersResult,
    providerSymbolsResult,
    resolutionStatusesResult,
    resolutionCandidatesResult,
    riskMetricSyncStatusesResult,
  ] = await Promise.all([
    listCategorizedInstruments(),
    getHistoricalOrdersForWeb(),
    listInstrumentProviderSymbols('fmp'),
    listInstrumentProviderResolutionStatuses('fmp'),
    listInstrumentProviderResolutionCandidates('fmp'),
    listInstrumentRiskMetricSyncStatuses('fmp'),
  ]);

  if (categoriesResult.isErr()) {
    throw new Error(categoriesResult.error.message);
  }

  if (ordersResult.isErr()) {
    throw new Error(ordersResult.error.message);
  }

  if (providerSymbolsResult.isErr()) {
    throw new Error(providerSymbolsResult.error.message);
  }

  if (resolutionStatusesResult.isErr()) {
    throw new Error(resolutionStatusesResult.error.message);
  }

  if (resolutionCandidatesResult.isErr()) {
    throw new Error(resolutionCandidatesResult.error.message);
  }

  if (riskMetricSyncStatusesResult.isErr()) {
    throw new Error(riskMetricSyncStatusesResult.error.message);
  }

  const quantitiesByIsin = getCurrentQuantitiesByIsin(ordersResult.value.items);
  const providerSymbolsByIsin = new Map(
    providerSymbolsResult.value.map((item) => [item.isin, item]),
  );
  const resolutionStatusByIsin = new Map(
    resolutionStatusesResult.value.map((item) => [item.isin, item]),
  );
  const resolutionCandidatesByIsin = groupByIsin(
    resolutionCandidatesResult.value,
  );
  const latestRiskMetricSyncStatusByKey = new Map(
    riskMetricSyncStatusesResult.value.map((item) => [
      `${item.isin}:${item.providerSymbol}`,
      item,
    ]),
  );

  const instruments = categoriesResult.value.map((instrument) => {
    const currentQuantity = quantitiesByIsin.get(instrument.isin) ?? 0;
    const providerSymbol = providerSymbolsByIsin.get(instrument.isin) ?? null;
    const resolutionStatus =
      resolutionStatusByIsin.get(instrument.isin) ?? null;
    const candidates = resolutionCandidatesByIsin.get(instrument.isin) ?? [];
    const riskMetricSyncStatus = providerSymbol
      ? (latestRiskMetricSyncStatusByKey.get(
          `${instrument.isin}:${providerSymbol.providerSymbol}`,
        ) ?? null)
      : null;

    return {
      ...instrument,
      currentQuantity,
      currentlyHeld: currentQuantity > 0,
      riskMapping: {
        candidates,
        mapping: providerSymbol,
        resolutionStatus,
        riskMetricSyncStatus,
        status: getRiskMappingStatus({
          mapping: providerSymbol,
          resolutionStatus,
          riskMetricSyncStatus,
        }),
      },
    };
  });

  return {
    capabilities,
    instruments,
    riskMappingSummary: {
      unresolvedCurrentHoldingsCount: instruments.filter(
        (instrument) => instrument.currentlyHeld && !instrument.riskMapping.mapping,
      ).length,
    },
  };
}

async function setInstrumentCategoriesAction(params: {
  isins: string[];
  category: string;
}) {
  if (params.isins.length === 0) {
    throw new Error('Select at least one instrument.');
  }

  if (params.category.trim().length === 0) {
    throw new Error('Category is required.');
  }

  const result = await setInstrumentCategories(params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

async function unsetInstrumentCategoriesAction(params: { isins: string[] }) {
  if (params.isins.length === 0) {
    throw new Error('Select at least one instrument.');
  }

  const result = await unsetInstrumentCategories(params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

async function refreshInstrumentProviderMappingsAction(params?: {
  force?: boolean;
  isins?: string[];
}) {
  await requireRiskMetricsFeatureEnabled();

  const result = await resolveInstrumentProviderMappings({
    force: params?.force,
    isins: params?.isins,
    provider: 'fmp',
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

async function confirmInstrumentProviderResolutionAction(params: {
  isin: string;
  providerSymbol: string;
}) {
  await requireRiskMetricsFeatureEnabled();

  if (params.isin.trim().length === 0) {
    throw new Error('ISIN is required.');
  }

  if (params.providerSymbol.trim().length === 0) {
    throw new Error('Provider symbol is required.');
  }

  const result = await confirmInstrumentProviderResolution({
    isin: params.isin,
    provider: 'fmp',
    providerSymbol: params.providerSymbol,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

async function clearInstrumentProviderResolutionAction(params: {
  isin: string;
}) {
  await requireRiskMetricsFeatureEnabled();

  if (params.isin.trim().length === 0) {
    throw new Error('ISIN is required.');
  }

  const result = await clearInstrumentProviderResolution({
    isin: params.isin,
    provider: 'fmp',
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

const getCurrentQuantitiesByIsin = (orders: WebHistoricalOrder[]) => {
  const quantitiesByIsin = new Map<string, number>();

  orders.forEach((order) => {
    const quantity = getFilledQuantity(order);

    if (quantity === 0) {
      return;
    }

    const previousQuantity = quantitiesByIsin.get(order.instrument.isin) ?? 0;
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;
    quantitiesByIsin.set(
      order.instrument.isin,
      roundQuantity(previousQuantity + signedQuantity),
    );
  });

  return quantitiesByIsin;
};

const getFilledQuantity = (order: WebHistoricalOrder) => {
  if (order.fills.length > 0) {
    return order.fills.reduce((sum, fill) => sum + Math.abs(fill.quantity), 0);
  }

  const quantity = order.filledQuantity ?? order.quantity;
  return quantity === null ? 0 : Math.abs(quantity);
};

const roundQuantity = (quantity: number) => {
  const rounded = Math.round(quantity * 1e10) / 1e10;
  return Math.abs(rounded) < 1e-10 ? 0 : rounded;
};

async function requireRiskMetricsFeatureEnabled(): Promise<AppCapabilities> {
  const capabilitiesResult = await getAppCapabilities();

  if (capabilitiesResult.isErr()) {
    throw new Error(capabilitiesResult.error.message);
  }

  if (!capabilitiesResult.value.riskMetricsFeatureEnabled) {
    throw new Error('Risk metrics feature is disabled.');
  }

  return capabilitiesResult.value;
}

const groupByIsin = (items: InstrumentProviderResolutionCandidate[]) => {
  const grouped = new Map<string, InstrumentProviderResolutionCandidate[]>();

  items.forEach((item) => {
    const current = grouped.get(item.isin) ?? [];
    current.push(item);
    grouped.set(item.isin, current);
  });

  return grouped;
};

const getRiskMappingStatus = ({
  mapping,
  resolutionStatus,
  riskMetricSyncStatus,
}: {
  mapping: InstrumentProviderSymbol | null;
  resolutionStatus: InstrumentProviderResolutionStatus | null;
  riskMetricSyncStatus: InstrumentRiskMetricSyncStatus | null;
}) => {
  if (mapping && riskMetricSyncStatus?.status === 'missing_beta') {
    return 'missing_beta' as const;
  }

  if (resolutionStatus) {
    return resolutionStatus.status;
  }

  return mapping ? ('resolved' as const) : ('unresolved' as const);
};

export {
  clearInstrumentProviderResolutionAction,
  confirmInstrumentProviderResolutionAction,
  getAllocationAction,
  getCategoryManagementAction,
  getRiskMappingsAction,
  refreshInstrumentProviderMappingsAction,
  setInstrumentCategoriesAction,
  unsetInstrumentCategoriesAction,
};
