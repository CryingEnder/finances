"use client";

import { useMemo } from "react";
import { Coins, TrendingUp } from "lucide-react";
import {
  Pie,
  Cell,
  Legend,
  Tooltip,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import { useDeposits } from "../../lib/hooks/use-deposits";
import { useDividends } from "../../lib/hooks/use-dividends";
import { usePortfolioEntries } from "../../lib/hooks/use-portfolio";

interface SummaryPieRow {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface SummaryDistributionPieProps {
  data: SummaryPieRow[];
  tooltipValueLabel: string;
  totalValue: number;
  title: string;
}

const COLORS = {
  deposits: "#10b981",
  stocks: "#3b82f6",
  dividends: "#f97316",
  profit: "#f59e0b",
  loss: "#ef4444",
};

interface PieTooltipPayload {
  name: string;
  value: number;
  payload: {
    color: string;
  };
}

interface SummaryPieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayload[];
  totalValue: number;
  valueLabel: string;
}

function SummaryPieTooltip({
  active,
  payload,
  totalValue,
  valueLabel,
}: SummaryPieTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0];
  if (!data) {
    return null;
  }

  const percentage =
    totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0";

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{data.name}</p>
      <p className="text-sm" style={{ color: data.payload.color }}>
        {valueLabel}:{" "}
        {data.value.toLocaleString("ro-RO", {
          style: "currency",
          currency: "RON",
        })}
      </p>
      <p className="text-sm text-zinc-400">Percentage: {percentage}%</p>
    </div>
  );
}

interface PieLabelProps {
  cx?: string | number;
  cy?: string | number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function PieSliceLabel(props: PieLabelProps) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  } = props;

  const cxNum = "string" === typeof cx ? parseFloat(cx) : cx;
  const cyNum = "string" === typeof cy ? parseFloat(cy) : cy;
  if (0 === percent) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cxNum + radius * Math.cos(-midAngle * RADIAN);
  const y = cyNum + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      dominantBaseline="central"
      className="text-sm font-medium"
      textAnchor={x > cxNum ? "start" : "end"}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

function SummaryVerticalLegend(props: {
  payload?: readonly {
    value?: unknown;
    color?: string;
    payload?: unknown;
  }[];
}) {
  const { payload } = props;
  if (!payload?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex w-full flex-col items-start gap-2.5 px-2">
      {payload.map((item, i) => {
        const row = item.payload as SummaryPieRow | undefined;
        const label =
          "string" === typeof row?.name
            ? row.name
            : "string" === typeof item.value
              ? item.value
              : "";
        const amount = "number" === typeof row?.value ? row.value : 0;
        const fill =
          "string" === typeof item.color && item.color.length > 0
            ? item.color
            : (row?.color ?? "#71717a");

        return (
          <div
            key={`${label}-${String(i)}`}
            className="flex w-full items-start justify-start gap-2.5 text-left text-sm text-zinc-300"
          >
            <span
              aria-hidden
              style={{ backgroundColor: fill }}
              className="mt-1.5 size-2.5 shrink-0 rounded-sm"
            />
            <span className="min-w-0 leading-snug">
              {label}:{" "}
              {amount.toLocaleString("ro-RO", {
                style: "currency",
                currency: "RON",
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryDistributionPie({
  data,
  tooltipValueLabel,
  totalValue,
  title,
}: SummaryDistributionPieProps) {
  if (0 === data.length || totalValue <= 0) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 flex flex-col min-h-128">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12">
          <p className="text-sm text-zinc-500 text-center px-4">
            Nothing to show for this view yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 flex flex-col min-h-128">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-112 min-h-112 w-full min-w-0 shrink-0">
        <ResponsiveContainer height={448} minWidth={0} width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              outerRadius={124}
              label={PieSliceLabel}
            >
              {data.map((entry, index) => (
                <Cell
                  fill={entry.color}
                  key={`cell-${entry.name}-${String(index)}`}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <SummaryPieTooltip
                  totalValue={totalValue}
                  valueLabel={tooltipValueLabel}
                />
              }
            />
            <Legend content={SummaryVerticalLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SummaryTab() {
  const { data: deposits = [], isLoading: depositsLoading } = useDeposits();
  const { data: portfolioEntries = [], isLoading: portfolioLoading } =
    usePortfolioEntries();
  const { data: dividends = [], isLoading: dividendsLoading } = useDividends();

  const summary = useMemo(() => {
    const totalDepositsCurrentValue = deposits.reduce(
      (sum, deposit) => sum + deposit.currentBalance,
      0,
    );

    const totalDepositsInvested = deposits.reduce(
      (sum, deposit) => sum + deposit.principal,
      0,
    );

    const dates = [...new Set(portfolioEntries.map((e) => e.date))].sort();
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : undefined;
    const latestPortfolioEntries =
      undefined !== latestDate
        ? portfolioEntries.filter((e) => e.date === latestDate)
        : [];

    const stocksCurrentValue = latestPortfolioEntries.reduce(
      (sum, entry) => sum + entry.quantity * entry.referencePrice,
      0,
    );

    const stocksInvestedValue = latestPortfolioEntries.reduce(
      (sum, entry) => sum + entry.quantity * entry.averagePrice,
      0,
    );

    const totalCurrentValue = totalDepositsCurrentValue + stocksCurrentValue;

    const totalInvested = totalDepositsInvested + stocksInvestedValue;

    const depositsProfit = totalDepositsCurrentValue - totalDepositsInvested;
    const stocksUnrealizedProfit = stocksCurrentValue - stocksInvestedValue;
    const totalProfit = depositsProfit + stocksUnrealizedProfit;

    return {
      totalDepositsInvested,
      totalDepositsCurrentValue,
      stocksInvestedValue,
      stocksCurrentValue,
      totalInvested,
      totalCurrentValue,
      depositsProfit,
      stocksUnrealizedProfit,
      totalProfit,
    };
  }, [deposits, portfolioEntries]);

  const totalDividends = useMemo(
    () => dividends.reduce((sum, d) => sum + d.amount, 0),
    [dividends],
  );

  const totalProfitWithDividends = useMemo(
    () => summary.totalProfit + totalDividends,
    [summary.totalProfit, totalDividends],
  );

  const pieBasisData = useMemo((): SummaryPieRow[] => {
    return [
      {
        name: "Term deposits (principal)",
        value: summary.totalDepositsInvested,
        color: COLORS.deposits,
      },
      {
        name: "Stocks (cost)",
        value: summary.stocksInvestedValue,
        color: COLORS.stocks,
      },
    ].filter((item) => item.value > 0);
  }, [summary]);

  const pieWealthData = useMemo((): SummaryPieRow[] => {
    const rows: SummaryPieRow[] = [
      {
        name: "Term deposits (with interest)",
        value: summary.totalDepositsCurrentValue,
        color: COLORS.deposits,
      },
    ];
    if (summary.stocksCurrentValue > 0 && totalDividends > 0) {
      rows.push(
        {
          name: "Stocks (market value)",
          value: summary.stocksCurrentValue,
          color: COLORS.stocks,
        },
        {
          name: "Dividends (cumulative)",
          value: totalDividends,
          color: COLORS.dividends,
        },
      );
    } else {
      if (summary.stocksCurrentValue > 0) {
        rows.push({
          name: "Stocks (market value)",
          value: summary.stocksCurrentValue,
          color: COLORS.stocks,
        });
      }
      if (totalDividends > 0) {
        rows.push({
          name: "Dividends (cumulative)",
          value: totalDividends,
          color: COLORS.dividends,
        });
      }
    }
    return rows.filter((item) => item.value > 0);
  }, [summary, totalDividends]);

  const pieBasisTotal = useMemo(
    () => pieBasisData.reduce((s, r) => s + r.value, 0),
    [pieBasisData],
  );

  const pieWealthTotal = useMemo(
    () => pieWealthData.reduce((s, r) => s + r.value, 0),
    [pieWealthData],
  );

  if (depositsLoading || portfolioLoading || dividendsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-zinc-400">Loading summary...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData =
    summary.totalCurrentValue > 0 || totalDividends > 0 || pieBasisTotal > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Term Deposits</p>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.totalDepositsCurrentValue.toLocaleString("ro-RO", {
                style: "currency",
                currency: "RON",
              })}
            </p>
            <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
              <p>
                Principal:{" "}
                {summary.totalDepositsInvested.toLocaleString("ro-RO", {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
              <p>
                Profit:{" "}
                <span
                  className={
                    summary.depositsProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {summary.depositsProfit >= 0 ? "+" : ""}
                  {summary.depositsProfit.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Stocks</p>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.stocksCurrentValue.toLocaleString("ro-RO", {
                style: "currency",
                currency: "RON",
              })}
            </p>
            <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
              <p>
                Invested:{" "}
                {summary.stocksInvestedValue.toLocaleString("ro-RO", {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
              <p>
                Unrealized:{" "}
                <span
                  className={
                    summary.stocksUnrealizedProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {summary.stocksUnrealizedProfit >= 0 ? "+" : ""}
                  {summary.stocksUnrealizedProfit.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-zinc-400 text-sm">Total Current Value</p>
                  <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                    RON
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {summary.totalCurrentValue.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    Invested:{" "}
                    {summary.totalInvested.toLocaleString("ro-RO", {
                      style: "currency",
                      currency: "RON",
                    })}
                  </p>
                )}
              </div>
              <div className="border-t border-zinc-700/80 pt-3">
                <p className="mb-2 text-sm text-zinc-400">Dividends</p>
                <p className="text-2xl font-bold text-white">
                  {totalDividends.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
                {0 === dividends.length && (
                  <p className="mt-1 text-sm text-zinc-400">No records yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Total Profit</p>
              <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                RON
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-zinc-500">
                  Excluding dividends
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {summary.totalProfit >= 0 ? "+" : ""}
                  {summary.totalProfit.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {(
                      (summary.totalProfit / summary.totalInvested) *
                      100
                    ).toFixed(2)}
                    % return
                  </p>
                )}
              </div>
              <div className="border-t border-zinc-700/80 pt-3">
                <p className="mb-1 text-xs text-zinc-500">
                  Including dividends
                </p>
                <p
                  className={`text-2xl font-bold ${
                    totalProfitWithDividends >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {totalProfitWithDividends >= 0 ? "+" : ""}
                  {totalProfitWithDividends.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {(
                      (totalProfitWithDividends / summary.totalInvested) *
                      100
                    ).toFixed(2)}
                    % return
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SummaryDistributionPie
              data={pieBasisData}
              tooltipValueLabel="Amount"
              totalValue={pieBasisTotal}
              title="Invested Capital Allocation"
            />
            <SummaryDistributionPie
              data={pieWealthData}
              tooltipValueLabel="Amount"
              totalValue={pieWealthTotal}
              title="Current Portfolio Composition"
            />
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <Coins className="mx-auto mb-6 h-16 w-16 text-zinc-500 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">
              No Investments Yet
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Start tracking your investments by adding deposits and stock
              transactions to see your portfolio summary here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
