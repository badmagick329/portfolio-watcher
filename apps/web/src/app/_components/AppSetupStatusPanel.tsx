'use client';

import type { AppCapabilitiesData } from '@/lib/client/app-capabilities';

type AppSetupStatusPanelProps = {
  capabilities: AppCapabilitiesData;
};

function AppSetupStatusPanel({ capabilities }: AppSetupStatusPanelProps) {
  const items = [
    {
      label: 'Broker connection',
      value: capabilities.hasBrokerCredentials ? 'Configured' : 'Missing',
      detail: capabilities.hasBrokerCredentials
        ? 'Trading 212 credentials detected.'
        : 'Add Trading 212 API credentials.',
    },
    {
      label: 'Order sync',
      value: capabilities.canSyncOrders ? 'Available' : 'Unavailable',
      detail: capabilities.canSyncOrders
        ? getLastSyncedText(capabilities.lastOrdersSyncAt, 'Not synced yet.')
        : 'Add Trading 212 API credentials.',
    },
    {
      label: 'Portfolio sync',
      value: capabilities.canSyncPortfolioState ? 'Available' : 'Unavailable',
      detail: capabilities.canSyncPortfolioState
        ? getLastSyncedText(capabilities.lastPortfolioSyncAt, 'Not synced yet.')
        : 'Add Trading 212 API credentials.',
    },
    {
      label: 'Order placement',
      value: getOrderPlacementLabel(capabilities),
      detail: getOrderPlacementDetail(capabilities),
    },
    {
      label: 'Risk metrics',
      value: getRiskMetricsLabel(capabilities),
      detail: getRiskMetricsDetail(capabilities),
    },
  ];

  return (
    <div className='grid gap-3 border border-border p-3 sm:grid-cols-2 xl:grid-cols-5'>
      {items.map((item) => (
        <div className='space-y-1' key={item.label}>
          <p className='text-xs uppercase text-muted-foreground'>{item.label}</p>
          <p className='font-mono text-sm'>{item.value}</p>
          <p className='text-xs text-muted-foreground'>{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

const getLastSyncedText = (value: string | null, fallback: string) =>
  value ? `Last synced ${formatDateTime(value)}.` : fallback;

const getOrderPlacementLabel = (capabilities: AppCapabilitiesData) => {
  if (capabilities.brokerAccessMode === 'missing') {
    return 'Unavailable';
  }

  if (capabilities.brokerAccessMode === 'trading_enabled') {
    return 'Enabled';
  }

  return 'Read-only or unknown';
};

const getOrderPlacementDetail = (capabilities: AppCapabilitiesData) => {
  if (capabilities.brokerAccessMode === 'missing') {
    return 'Add Trading 212 API credentials.';
  }

  if (capabilities.brokerAccessMode === 'trading_enabled') {
    return 'Live order placement has succeeded before.';
  }

  return 'Live order placement unavailable or not yet verified.';
};

const getRiskMetricsLabel = (capabilities: AppCapabilitiesData) => {
  if (!capabilities.riskMetricsFeatureEnabled) {
    return 'Disabled';
  }

  if (capabilities.hasStoredRiskMetrics) {
    return capabilities.hasFmpApiKey ? 'Enabled' : 'Stored only';
  }

  return capabilities.canSyncRiskMetrics ? 'Available' : 'Unavailable';
};

const getRiskMetricsDetail = (capabilities: AppCapabilitiesData) => {
  if (!capabilities.riskMetricsFeatureEnabled) {
    return 'Risk metrics feature is turned off.';
  }

  if (capabilities.hasStoredRiskMetrics && !capabilities.hasFmpApiKey) {
    return 'Stored beta data available. Add FMP key to refresh.';
  }

  if (capabilities.canSyncRiskMetrics) {
    return getLastSyncedText(
      capabilities.lastRiskMetricsSyncAt,
      'Enabled, not yet synced.',
    );
  }

  return 'Add FMP key to enable beta sync.';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export { AppSetupStatusPanel };
