import 'server-only';

import { createWebServices } from '@portfolio/composition';

let webServices: ReturnType<typeof createWebServices> | null = null;

const getWebServices = () => {
  if (!webServices) {
    webServices = createWebServices();
  }

  return webServices;
};

export const getAppCapabilities = () => getWebServices().getAppCapabilities();
export const clearInstrumentProviderResolution = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['clearInstrumentProviderResolution']
  >
) => getWebServices().clearInstrumentProviderResolution(...args);
export const confirmInstrumentProviderResolution = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['confirmInstrumentProviderResolution']
  >
) => getWebServices().confirmInstrumentProviderResolution(...args);
export const getDistinctInstruments = () =>
  getWebServices().getDistinctInstruments();
export const getHistoricalOrdersForWeb = (
  ...args: Parameters<ReturnType<typeof createWebServices>['getHistoricalOrdersForWeb']>
) => getWebServices().getHistoricalOrdersForWeb(...args);
export const getLatestAccountSummarySnapshot = () =>
  getWebServices().getLatestAccountSummarySnapshot();
export const getLatestCurrentPositionSnapshot = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['getLatestCurrentPositionSnapshot']
  >
) => getWebServices().getLatestCurrentPositionSnapshot(...args);
export const getLatestInstrumentPrice = (
  ...args: Parameters<ReturnType<typeof createWebServices>['getLatestInstrumentPrice']>
) => getWebServices().getLatestInstrumentPrice(...args);
export const getLatestInstrumentRiskMetric = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['getLatestInstrumentRiskMetric']
  >
) => getWebServices().getLatestInstrumentRiskMetric(...args);
export const listCategorizedInstruments = (
  ...args: Parameters<ReturnType<typeof createWebServices>['listCategorizedInstruments']>
) => getWebServices().listCategorizedInstruments(...args);
export const listInstrumentProviderResolutionCandidates = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['listInstrumentProviderResolutionCandidates']
  >
) => getWebServices().listInstrumentProviderResolutionCandidates(...args);
export const listInstrumentProviderResolutionStatuses = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['listInstrumentProviderResolutionStatuses']
  >
) => getWebServices().listInstrumentProviderResolutionStatuses(...args);
export const listInstrumentProviderSymbols = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['listInstrumentProviderSymbols']
  >
) => getWebServices().listInstrumentProviderSymbols(...args);
export const listInstrumentRiskMetricSyncStatuses = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['listInstrumentRiskMetricSyncStatuses']
  >
) => getWebServices().listInstrumentRiskMetricSyncStatuses(...args);
export const resolveInstrumentProviderMappings = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['resolveInstrumentProviderMappings']
  >
) => getWebServices().resolveInstrumentProviderMappings(...args);
export const saveManualInstrumentPrice = (
  ...args: Parameters<ReturnType<typeof createWebServices>['saveManualInstrumentPrice']>
) => getWebServices().saveManualInstrumentPrice(...args);
export const setInstrumentCategories = (
  ...args: Parameters<ReturnType<typeof createWebServices>['setInstrumentCategories']>
) => getWebServices().setInstrumentCategories(...args);
export const syncHistoricalOrders = () => getWebServices().syncHistoricalOrders();
export const syncT212InstrumentCatalog = () =>
  getWebServices().syncT212InstrumentCatalog();
export const syncPortfolioState = () => getWebServices().syncPortfolioState();
export const unsetInstrumentCategories = (
  ...args: Parameters<
    ReturnType<typeof createWebServices>['unsetInstrumentCategories']
  >
) => getWebServices().unsetInstrumentCategories(...args);
