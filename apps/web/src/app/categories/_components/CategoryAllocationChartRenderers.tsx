import { CATEGORY_CHART_THEME } from '@/lib/client/categories/category-chart-theme';
import { formatCategoryName } from '@/lib/client/categories/display-category';
import type { CategoryAllocationRow } from '@/lib/client/categories/instrument-category-allocation';
import {
  formatMoney,
  formatPercent,
  NA_LABEL,
} from '@/lib/client/presentation/format-values';
import { Rectangle, Sector } from 'recharts';
import type { BarShapeProps, PieSectorShapeProps } from 'recharts';

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

type BarShapeWithPayload = BarShapeProps & {
  payload?: CategoryAllocationRow;
};

function renderNetInvestedBarShape(props: BarShapeProps) {
  const row = (props as BarShapeWithPayload).payload;

  return (
    <Rectangle
      {...props}
      fill={
        (row?.netInvested ?? 0) < 0
          ? CATEGORY_CHART_THEME.netInvestedWithdrawal
          : CATEGORY_CHART_THEME.netInvestedAddition
      }
    />
  );
}

function renderReturnBarShape(props: BarShapeProps) {
  const row = (props as BarShapeWithPayload).payload;

  return (
    <Rectangle
      {...props}
      fill={
        (row?.returnPercent ?? 0) < 0
          ? CATEGORY_CHART_THEME.negativeReturn
          : CATEGORY_CHART_THEME.positiveReturn
      }
    />
  );
}

function renderAllocationPieShape(props: PieSectorShapeProps, index: number) {
  return (
    <Sector
      {...props}
      fill={
        CATEGORY_CHART_THEME.allocationColors[
          index % CATEGORY_CHART_THEME.allocationColors.length
        ]
      }
    />
  );
}

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

export {
  renderAllocationLabel,
  renderAllocationPieShape,
  renderNetInvestedBarShape,
  renderNetInvestedLabel,
  renderReturnBarShape,
};
