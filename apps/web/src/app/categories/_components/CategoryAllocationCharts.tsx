'use client';

import { CATEGORY_CHART_THEME } from '@/lib/client/categories/category-chart-theme';
import { formatCategoryName } from '@/lib/client/categories/display-category';
import {
  formatMoney,
  formatPercent,
} from '@/lib/client/presentation/format-values';
import type { CategoryAllocationRow } from '@/lib/client/categories/instrument-category-allocation';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  renderAllocationLabel,
  renderAllocationPieShape,
  renderNetInvestedBarShape,
  renderNetInvestedLabel,
  renderReturnBarShape,
} from './CategoryAllocationChartRenderers';
import {
  AllocationTooltip,
  NetInvestedTooltip,
  ReturnTooltip,
} from './CategoryAllocationTooltips';

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
  const allocationChartRows = rows.map((row, index) => ({
    ...row,
    fill:
      CATEGORY_CHART_THEME.allocationColors[
        index % CATEGORY_CHART_THEME.allocationColors.length
      ],
  }));

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
              <Bar dataKey='netInvested' shape={renderNetInvestedBarShape}>
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
                data={allocationChartRows}
                dataKey='currentValue'
                innerRadius={58}
                label={renderAllocationLabel}
                labelLine={false}
                nameKey='category'
                outerRadius={110}
                paddingAngle={2}
                shape={renderAllocationPieShape}
              />
              <Tooltip content={<AllocationTooltip hideValues={hideValues} />} />
              <Legend formatter={(value) => formatCategoryName(String(value))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className='flex min-h-96 flex-col gap-3'>
        <div>
          <h2 className='font-mono text-lg'>
            Return by category
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
                shape={renderReturnBarShape}
              />
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

export { CategoryAllocationCharts };
