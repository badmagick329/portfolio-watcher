'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  RiskMappingsPanelActions,
  RiskMappingsPanelModel,
} from '@/lib/client/categories/useInstrumentCategoriesController';

type RiskMappingsPanelProps = {
  actions: RiskMappingsPanelActions;
  model: RiskMappingsPanelModel;
};

function RiskMappingsPanel({ actions, model }: RiskMappingsPanelProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({});
  const visibleInstruments = useMemo(
    () =>
      model.instruments
        .filter(
          (instrument) =>
            instrument.currentlyHeld ||
            instrument.riskMapping.status !== 'resolved' ||
            instrument.riskMapping.mapping !== null ||
            instrument.riskMapping.candidates.length > 0,
        )
        .sort((left, right) => {
          const leftRank = statusRank(left.riskMapping.status);
          const rightRank = statusRank(right.riskMapping.status);

          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          if (left.currentlyHeld !== right.currentlyHeld) {
            return left.currentlyHeld ? -1 : 1;
          }

          return left.ticker.localeCompare(right.ticker);
        }),
    [model.instruments],
  );
  const hasFmpKey = model.capabilities.hasFmpApiKey;
  const canRefreshAll =
    hasFmpKey &&
    visibleInstruments.some((instrument) => instrument.riskMapping.mapping === null);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <h2 className='font-mono text-xl'>Risk mappings</h2>
          <p className='text-sm text-muted-foreground'>
            Resolve FMP symbols for portfolio instruments so beta sync can run
            without manual CLI mapping.
          </p>
          {model.unresolvedCurrentHoldingsCount > 0 ? (
            <p className='text-sm text-muted-foreground'>
              {model.unresolvedCurrentHoldingsCount} current holding
              {model.unresolvedCurrentHoldingsCount === 1 ? '' : 's'} still
              missing an FMP mapping.
            </p>
          ) : null}
          {model.refreshSummary ? (
            <p className='text-sm text-muted-foreground'>
              Refresh summary: processed {model.refreshSummary.processed},{' '}
              resolved {model.refreshSummary.resolved}, ambiguous{' '}
              {model.refreshSummary.ambiguous}, unresolved{' '}
              {model.refreshSummary.unresolved}, skipped fresh{' '}
              {model.refreshSummary.skippedFresh}, skipped cooldown{' '}
              {model.refreshSummary.skippedCooldown}
              {model.refreshSummary.rateLimited ? ', rate limited' : ''}.
            </p>
          ) : null}
        </div>
        <Button
          disabled={!canRefreshAll || model.isRefreshing}
          onClick={actions.refreshAllUnresolved}
          type='button'
          variant='outline'
        >
          Refresh unresolved suggestions
        </Button>
      </div>

      {!hasFmpKey ? (
        <p className='text-sm text-muted-foreground'>
          Add FMP key to refresh suggestions or resolve new mappings.
        </p>
      ) : null}

      <div className='flex items-center justify-between gap-3'>
        <p className='text-xs text-muted-foreground'>
          Scroll sideways to inspect details. Actions stay pinned on the right.
        </p>
      </div>

      <div className='w-full overflow-x-auto'>
        <Table className='min-w-[1080px]'>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Current mapping</TableHead>
              <TableHead>Suggested candidates</TableHead>
              <TableHead className='sticky right-0 z-10 bg-background shadow-[-12px_0_12px_-12px_rgba(0,0,0,0.7)]'>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleInstruments.map((instrument) => {
              const selectedCandidate =
                selectedCandidates[instrument.isin] ??
                instrument.riskMapping.candidates[0]?.candidateSymbol ??
                '';

              return (
                <TableRow key={instrument.isin}>
                  <TableCell>
                    <div className='flex flex-col gap-1'>
                      <Badge
                        className={statusBadgeClassName(
                          instrument.riskMapping.status,
                        )}
                        variant='outline'
                      >
                        {formatRiskMappingStatus(instrument.riskMapping.status)}
                      </Badge>
                      {instrument.riskMapping.resolutionStatus?.message ? (
                        <span className='text-xs text-muted-foreground'>
                          {instrument.riskMapping.resolutionStatus.message}
                        </span>
                      ) : instrument.riskMapping.riskMetricSyncStatus?.message ? (
                        <span className='text-xs text-muted-foreground'>
                          {instrument.riskMapping.riskMetricSyncStatus.message}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{instrument.ticker}</TableCell>
                  <TableCell>{instrument.name}</TableCell>
                  <TableCell>{instrument.isin}</TableCell>
                  <TableCell>
                    {instrument.riskMapping.mapping?.providerSymbol ?? 'n/a'}
                  </TableCell>
                  <TableCell>
                    {instrument.riskMapping.candidates.length > 0 ? (
                      <select
                        className='min-w-72 border border-border bg-background px-3 py-2 text-sm'
                        onChange={(event) =>
                          setSelectedCandidates((current) => ({
                            ...current,
                            [instrument.isin]: event.target.value,
                          }))
                        }
                        value={selectedCandidate}
                      >
                        {instrument.riskMapping.candidates.map((candidate) => (
                          <option
                            key={`${instrument.isin}:${candidate.candidateSymbol}`}
                            value={candidate.candidateSymbol}
                          >
                            {formatCandidateLabel(candidate)}
                          </option>
                        ))}
                      </select>
                    ) : instrument.riskMapping.resolutionStatus?.lastErrorCode ===
                      'RATE_LIMIT' ? (
                      <span className='text-sm text-warning'>
                        Rate limited while fetching suggestions
                      </span>
                    ) : instrument.riskMapping.resolutionStatus?.noCandidates ? (
                      <span className='text-sm text-muted-foreground'>
                        No FMP candidates found
                      </span>
                    ) : instrument.riskMapping.resolutionStatus?.fetchedAt ? (
                      <span className='text-sm text-muted-foreground'>
                        No cached suggestions
                      </span>
                    ) : (
                      <span className='text-sm text-muted-foreground'>
                        Not fetched yet
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='sticky right-0 z-10 bg-background shadow-[-12px_0_12px_-12px_rgba(0,0,0,0.7)]'>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        disabled={!hasFmpKey || model.isRefreshing}
                        onClick={() => actions.refreshInstrument(instrument.isin)}
                        type='button'
                        variant='outline'
                      >
                        Refresh
                      </Button>
                      <Button
                        disabled={!selectedCandidate}
                        onClick={() =>
                          actions.confirmMapping({
                            isin: instrument.isin,
                            providerSymbol: selectedCandidate,
                          })
                        }
                        type='button'
                      >
                        Use selected
                      </Button>
                      <Button
                        disabled={!instrument.riskMapping.mapping}
                        onClick={() => actions.clearMapping(instrument.isin)}
                        type='button'
                        variant='outline'
                      >
                        Clear
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleInstruments.length === 0 ? (
              <TableRow>
                <TableCell className='text-muted-foreground' colSpan={8}>
                  No portfolio instruments need risk mapping attention.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const formatCandidateLabel = (candidate: {
  candidateSymbol: string;
  candidateName: string | null;
  candidateIsin: string | null;
  score: number;
  evidence: string | null;
}) =>
  [
    candidate.candidateSymbol,
    candidate.candidateName,
    readCandidateMarketLabel(candidate.evidence),
    candidate.candidateIsin,
    `score ${candidate.score}`,
  ]
    .filter(Boolean)
    .join(' - ');

const readCandidateMarketLabel = (evidence: string | null) => {
  if (!evidence) {
    return null;
  }

  try {
    const parsed = JSON.parse(evidence);
    if (typeof parsed.market === 'string' && parsed.market.trim().length > 0) {
      return parsed.market;
    }

    if (
      typeof parsed.marketCode === 'string' &&
      parsed.marketCode.trim().length > 0
    ) {
      return parsed.marketCode;
    }

    return null;
  } catch {
    return null;
  }
};

const formatRiskMappingStatus = (
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'missing_beta',
) => status.replace('_', ' ');

const statusRank = (
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'missing_beta',
) => {
  switch (status) {
    case 'unresolved':
      return 0;
    case 'ambiguous':
      return 1;
    case 'missing_beta':
      return 2;
    default:
      return 3;
  }
};

const statusBadgeClassName = (
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'missing_beta',
) => {
  switch (status) {
    case 'resolved':
      return 'border-positive/30 text-positive';
    case 'ambiguous':
      return 'border-warning/30 text-warning';
    case 'missing_beta':
      return 'border-negative/30 text-negative';
    default:
      return 'border-border text-muted-foreground';
  }
};

export { RiskMappingsPanel };
