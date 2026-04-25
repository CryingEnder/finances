"use client";

import { useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import {
  Pie,
  Cell,
  Legend,
  Tooltip,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import { useDeposits } from "../../lib/hooks/use-deposits";
import { usePortfolioEntries } from "../../lib/hooks/use-portfolio";

const COLORS = {
  deposits: "#10b981",
  stocks: "#3b82f6",
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
  totalCurrentValue: number;
}

function SummaryPieTooltip({
  active,
  payload,
  totalCurrentValue,
}: SummaryPieTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0];
  if (!data) {
    return null;
  }

  const percentage =
    totalCurrentValue > 0
      ? ((data.value / totalCurrentValue) * 100).toFixed(1)
      : "0";

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{data.name}</p>
      <p className="text-sm" style={{ color: data.payload.color }}>
        Current Value:{" "}
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

export default function SummaryTab() {
  const { data: deposits = [], isLoading: depositsLoading } = useDeposits();
  const { data: portfolioEntries = [], isLoading: portfolioLoading } =
    usePortfolioEntries();

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
    const latestDate = dates[dates.length - 1];
    const latestPortfolioEntries = portfolioEntries.filter(
      (e) => e.date === latestDate,
    );

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

  const pieChartData = useMemo(() => {
    const data = [
      {
        name: "Term Deposits",
        value: summary.totalDepositsCurrentValue,
        color: COLORS.deposits,
      },
      {
        name: "Stocks",
        value: summary.stocksCurrentValue,
        color: COLORS.stocks,
      },
    ].filter((item) => item.value > 0);

    return data;
  }, [summary]);

  if (depositsLoading || portfolioLoading) {
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

  const hasData = summary.totalCurrentValue > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Total Current Value</p>
            <DollarSign className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {summary.totalCurrentValue.toLocaleString("ro-RO", {
              style: "currency",
              currency: "RON",
            })}
          </p>
          {summary.totalInvested > 0 && (
            <p className="text-sm text-zinc-400 mt-1">
              Invested:{" "}
              {summary.totalInvested.toLocaleString("ro-RO", {
                style: "currency",
                currency: "RON",
              })}
            </p>
          )}
        </div>

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

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Total Profit</p>
            {summary.totalProfit >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
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
            <p className="text-sm text-zinc-400 mt-1">
              {((summary.totalProfit / summary.totalInvested) * 100).toFixed(2)}
              % return
            </p>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      {hasData ? (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Current Value Distribution
          </h3>
          <div className="h-96 w-full min-w-0">
            <ResponsiveContainer height={384} minWidth={0} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  outerRadius={120}
                  data={pieChartData}
                  label={PieSliceLabel}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell fill={entry.color} key={`cell-${String(index)}`} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <SummaryPieTooltip
                      totalCurrentValue={summary.totalCurrentValue}
                    />
                  }
                />
                <Legend
                  formatter={(
                    value: string,
                    entry: { payload?: { value?: number } },
                  ) => {
                    const entryValue = entry.payload?.value ?? 0;
                    return (
                      <span className="text-zinc-300">
                        {value}:{" "}
                        {entryValue.toLocaleString("ro-RO", {
                          style: "currency",
                          currency: "RON",
                        })}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-6 text-zinc-500 opacity-50" />
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
