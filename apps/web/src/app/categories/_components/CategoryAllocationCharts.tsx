'use client';

import { formatCategoryName } from '@/lib/client/display-category';
import {
  formatMoney,
  formatPercent,
  NA_LABEL,
} from '@/lib/client/format-values';
import type { CategoryAllocationRow } from '@/lib/client/instrument-category-allocation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORY_CHART_THEME } from './category-chart-theme';

type CategoryAllocationChartsProps = {
  hideValues: boolean;
  isHistorical: boolean;
  mode: 'current' | 'historical';
  returnRows: CategoryAllocationRow[];
  rows: CategoryAllocationRow[];
  totalCurrentValue: number;
};

function CategoryAllocationCharts({
  hideValues,
  isHistorical,
  mode,
  returnRows,
  rows,
  totalCurrentValue,
}: CategoryAllocationChartsProps) {
  return (
    <div className='grid gap-8 xl:grid-cols-2'>
      <section className='flex min-h-96 flex-col gap-3'>
        <div>
          <h2 className='font-mono text-lg'>
            {isHistorical ? 'Net invested by category' : 'Allocation by category'}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {isHistorical
              ? 'Buys minus sells in the selected range.'
              : 'Current value share.'}
          </p>
        </div>
        {isHistorical ? (
          <ResponsiveContainer height={320} width='100%'>
            <BarChart
              data={rows}
              layout='vertical'
              margin={{ bottom: 8, left: 24, right: 120, top: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray='3 3' />
              <XAxis
                tickFormatter={(value) =>
                  hideValues ? '' : formatMoney(Number(value))
                }
                type='number'
              />
              <YAxis
                dataKey='category'
                tickFormatter={(value) => formatCategoryName(String(value))}
                type='category'
                width={110}
              />
              <Tooltip content={<NetInvestedTooltip hideValues={hideValues} />} />
              <ReferenceLine stroke='currentColor' x={0} />
              <Bar dataKey='netInvested'>
                {rows.map((row) => (
                  <Cell
                    fill={
                      (row.netInvested ?? 0) < 0
                        ? CATEGORY_CHART_THEME.netInvestedWithdrawal
                        : CATEGORY_CHART_THEME.netInvestedAddition
                    }
                    key={row.category}
                  />
                ))}
                <LabelList
                  content={(props) =>
                    renderNetInvestedLabel({
                      ...props,
                      hideValues,
                      totalNetInvested: totalCurrentValue,
                    })
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer height={320} width='100%'>
            <PieChart>
              <Pie
                data={rows}
                dataKey='currentValue'
                innerRadius={58}
                label={renderAllocationLabel}
                labelLine={false}
                nameKey='category'
                outerRadius={110}
                paddingAngle={2}
              >
                {rows.map((row, index) => (
                  <Cell
                    fill={
                      CATEGORY_CHART_THEME.allocationColors[
                        index % CATEGORY_CHART_THEME.allocationColors.length
                      ]
                    }
                    key={row.category}
                  />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip hideValues={hideValues} />} />
              <Legend formatter={(value) => formatCategoryName(String(value))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className='flex min-h-96 flex-col gap-3'>
        <div>
          <h2 className='font-mono text-lg'>
            {isHistorical
              ? 'Return by category'
              : 'Unrealized return by category'}
          </h2>
        </div>
        {returnRows.length > 0 ? (
          <ResponsiveContainer height={320} width='100%'>
            <BarChart
              data={returnRows}
              layout='vertical'
              margin={{ bottom: 8, left: 24, right: 24, top: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray='3 3' />
              <XAxis
                tickFormatter={(value) => formatPercent(Number(value))}
                type='number'
              />
              <YAxis
                dataKey='category'
                tickFormatter={(value) => formatCategoryName(String(value))}
                type='category'
                width={110}
              />
              <Tooltip
                content={
                  <ReturnTooltip hideValues={hideValues} mode={mode} />
                }
              />
              <ReferenceLine stroke='currentColor' x={0} />
              <Bar
                dataKey={(row: CategoryAllocationRow) =>
                  row.returnPercent ?? 0
                }
              >
                {returnRows.map((row) => (
                  <Cell
                    fill={
                      (row.returnPercent ?? 0) < 0
                        ? CATEGORY_CHART_THEME.negativeReturn
                        : CATEGORY_CHART_THEME.positiveReturn
                    }
                    key={row.category}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className='text-sm text-muted-foreground'>
            No in-range buys to calculate returns.
          </p>
        )}
      </section>
    </div>
  );
}

function AllocationTooltip({
  active,
  hideValues = false,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>Value: {formatMoney(row.currentValue, { hideValues })}</p>
      <p>Share: {formatPercent(row.allocationPercent)}</p>
      <p>Holdings: {row.holdingCount}</p>
    </div>
  );
}

function NetInvestedTooltip({
  active,
  hideValues = false,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>Buys: {formatMoney(row.buyCost ?? 0, { hideValues })}</p>
      <p>Sells: {formatMoney(row.sellProceeds ?? 0, { hideValues })}</p>
      <p>Net invested: {formatMoney(row.netInvested ?? 0, { hideValues })}</p>
      <p>Instruments: {row.holdingCount}</p>
    </div>
  );
}

function ReturnTooltip({
  active,
  hideValues = false,
  mode,
  payload,
}: TooltipProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload as CategoryAllocationRow;

  return (
    <div className='border border-border bg-background p-2 text-xs shadow-sm'>
      <p className='font-medium'>{formatCategoryName(row.category)}</p>
      <p>
        Return:{' '}
        {row.returnPercent === null
          ? NA_LABEL
          : formatPercent(row.returnPercent)}
      </p>
      <p>
        {mode === 'historical' ? 'P/L' : 'Unrealized P/L'}:{' '}
        {row.unrealizedPnl === null
          ? NA_LABEL
          : formatMoney(row.unrealizedPnl, { hideValues })}
      </p>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  hideValues?: boolean;
  mode?: 'current' | 'historical';
  payload?: Array<{ payload: unknown }>;
};

type PieLabelProps = {
  cx?: number | string;
  cy?: number | string;
  midAngle?: number | string;
  outerRadius?: number | string;
  payload?: CategoryAllocationRow;
};

type NetInvestedLabelProps = {
  height?: number | string;
  hideValues: boolean;
  payload?: CategoryAllocationRow;
  totalNetInvested: number;
  value?: unknown;
  width?: number | string;
  x?: number | string;
  y?: number | string;
};

function renderNetInvestedLabel({
  height,
  hideValues,
  payload,
  totalNetInvested,
  value,
  width,
  x,
  y,
}: NetInvestedLabelProps) {
  const netInvested = Number(payload?.netInvested ?? value ?? 0);

  if (netInvested === 0) {
    return null;
  }

  const barX = Number(x ?? 0);
  const barY = Number(y ?? 0);
  const barWidth = Number(width ?? 0);
  const barHeight = Number(height ?? 0);
  const isWithdrawal = netInvested < 0;
  const labelX = isWithdrawal ? barX - 8 : barX + barWidth + 8;
  const labelY = barY + barHeight / 2;
  const share =
    totalNetInvested === 0
      ? NA_LABEL
      : formatPercent(netInvested / totalNetInvested);
  const label = hideValues ? share : `${formatMoney(netInvested)} (${share})`;
  const backgroundWidth = label.length * 7.4 + 12;
  const backgroundHeight = 20;
  const backgroundX = isWithdrawal ? labelX - backgroundWidth + 6 : labelX - 6;
  const backgroundY = labelY - backgroundHeight / 2;

  return (
    <g>
      <rect
        fill={CATEGORY_CHART_THEME.labelBackground}
        height={backgroundHeight}
        opacity={0.92}
        rx={4}
        width={backgroundWidth}
        x={backgroundX}
        y={backgroundY}
      />
      <text
        dominantBaseline='central'
        fill={CATEGORY_CHART_THEME.labelForeground}
        fontSize={12}
        textAnchor={isWithdrawal ? 'end' : 'start'}
        x={labelX}
        y={labelY}
      >
        {label}
      </text>
    </g>
  );
}

function renderAllocationLabel(props: PieLabelProps) {
  const percent = props.payload?.allocationPercent ?? 0;

  if (percent < 0.02) {
    return null;
  }

  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const radius = outerRadius + 26;
  const radians = (-midAngle * Math.PI) / 180;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text
      dominantBaseline='central'
      fill='currentColor'
      fontSize={12}
      textAnchor={x > cx ? 'start' : 'end'}
      x={x}
      y={y}
    >
      {formatCategoryName(props.payload?.category)} {formatPercent(percent)}
    </text>
  );
}

export { CategoryAllocationCharts };
