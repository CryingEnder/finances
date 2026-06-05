"use client";

import { InfoTooltip } from "../../components/ui/info-tooltip";

export interface PositionProfitSummary {
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  realizedProfit: number;
  realizedProfitPercent: number;
}

export interface PositionProfitLabels {
  columnTitle: string;
  tooltip: string;
  unrealized: string;
  unrealizedPercent: string;
  realized: string;
  realizedPercent: string;
}

function profitColorClass(value: number): string {
  return value >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold";
}

export function PositionProfitColumnHeader({
  labels,
}: {
  labels: PositionProfitLabels;
}) {
  return (
    <span className="inline-flex items-center justify-start gap-1">
      {labels.columnTitle}
      <InfoTooltip placement="bottom" content={labels.tooltip} />
    </span>
  );
}

export function PositionProfitCell({
  summary,
  labels,
  numberFormat,
}: {
  summary: PositionProfitSummary;
  labels: PositionProfitLabels;
  numberFormat: string;
}) {
  const formatAmount = (value: number) =>
    value.toLocaleString(numberFormat, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const rows = [
    {
      label: labels.unrealized,
      display: formatAmount(summary.unrealizedProfit),
      profitValue: summary.unrealizedProfit,
    },
    {
      label: labels.unrealizedPercent,
      display: `${summary.unrealizedProfitPercent.toFixed(2)}%`,
      profitValue: summary.unrealizedProfitPercent,
    },
    {
      label: labels.realized,
      display: formatAmount(summary.realizedProfit),
      profitValue: summary.realizedProfit,
    },
    {
      label: labels.realizedPercent,
      display: `${summary.realizedProfitPercent.toFixed(2)}%`,
      profitValue: summary.realizedProfitPercent,
    },
  ];

  return (
    <div className="text-xs space-y-0.5 tabular-nums whitespace-nowrap text-left">
      {rows.map((row) => (
        <div key={row.label}>
          <span className="text-zinc-400">{row.label}: </span>
          <span className={profitColorClass(row.profitValue)}>{row.display}</span>
        </div>
      ))}
    </div>
  );
}
