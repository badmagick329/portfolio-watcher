'use client';

import { EMPTY_APP_CAPABILITIES } from '@/lib/client/app-capabilities';
import type { ResolveInstrumentProviderMappingsResult } from '@portfolio/domain';
import { useRiskMappingsQuery } from './useRiskMappingsQuery';
import { useInstrumentCategoryMutations } from './useInstrumentCategoryMutations';

type RiskMappingsStatus =
  | { state: 'loading' }
  | { message: string; state: 'error' }
  | { state: 'ready' };

type RiskMappingsModel = {
  capabilities: ReturnType<typeof useRiskMappingsQuery>['data'] extends {
    capabilities: infer T;
  }
    ? T
    : typeof EMPTY_APP_CAPABILITIES;
  instruments: NonNullable<ReturnType<typeof useRiskMappingsQuery>['data']>['instruments'];
  isRefreshing: boolean;
  refreshSummary: ResolveInstrumentProviderMappingsResult | null;
  unresolvedCurrentHoldingsCount: number;
};

type RiskMappingsActions = {
  clearMapping: (isin: string) => void;
  confirmMapping: (params: { isin: string; providerSymbol: string }) => void;
  refreshAllUnresolved: () => void;
  refreshInstrument: (isin: string) => void;
};

function useRiskMappingsController() {
  const { data, error, isLoading } = useRiskMappingsQuery();
  const { clearRiskMapping, confirmRiskMapping, refreshRiskMappings } =
    useInstrumentCategoryMutations();
  const status: RiskMappingsStatus = isLoading
    ? { state: 'loading' }
    : error || !data
      ? {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load risk mappings.',
          state: 'error',
        }
      : { state: 'ready' };

  return {
    actions: {
      clearMapping: (isin) => {
        clearRiskMapping.mutate({ isin });
      },
      confirmMapping: ({ isin, providerSymbol }) => {
        confirmRiskMapping.mutate({ isin, providerSymbol });
      },
      refreshAllUnresolved: () => {
        refreshRiskMappings.mutate({ force: false });
      },
      refreshInstrument: (isin) => {
        refreshRiskMappings.mutate({ force: true, isins: [isin] });
      },
    } satisfies RiskMappingsActions,
    model: {
      capabilities: data?.capabilities ?? EMPTY_APP_CAPABILITIES,
      instruments: data?.instruments ?? [],
      isRefreshing: refreshRiskMappings.isPending,
      refreshSummary: refreshRiskMappings.data ?? null,
      unresolvedCurrentHoldingsCount:
        data?.riskMappingSummary.unresolvedCurrentHoldingsCount ?? 0,
    } satisfies RiskMappingsModel,
    status,
  };
}

export { useRiskMappingsController };
export type {
  RiskMappingsActions as RiskMappingsPanelActions,
  RiskMappingsModel as RiskMappingsPanelModel,
  RiskMappingsStatus,
};
