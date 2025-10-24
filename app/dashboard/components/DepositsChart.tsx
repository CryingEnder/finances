"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { DepositWithCalculations, DepositSummary } from "../../lib/types";

interface DepositsChartProps {
  deposits: DepositWithCalculations[];
  summary: DepositSummary;
}

export default function DepositsChart({
  deposits,
  summary,
}: DepositsChartProps) {
  const barChartData = deposits.map((deposit) => ({
    name: `${deposit.bank} - ${deposit.depositName}`.substring(0, 20),
    principal: deposit.principal,
    currentBalance: deposit.currentBalance,
    earnedInterest: deposit.earnedInterest,
    returnPercent: deposit.totalReturnPercent,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const labelMap: { [key: string]: string } = {
              principal: "Principal",
              currentBalance: "Current Balance",
              earnedInterest: "Earned Interest",
            };
            const readableLabel = labelMap[entry.dataKey] || entry.dataKey;

            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {readableLabel}:{" "}
                {entry.value.toLocaleString("ro-RO", {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (deposits.length === 0) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-8">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-zinc-500 opacity-50" />
          <p className="text-zinc-400">No data available for charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Deposit Analytics
        </h3>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barChartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={12}
              angle={0}
              textAnchor="middle"
              height={100}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) =>
                value.toLocaleString("ro-RO", {
                  style: "currency",
                  currency: "RON",
                  minimumFractionDigits: 0,
                })
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(63, 63, 70, 0.3)" }}
            />
            <Bar
              dataKey="principal"
              fill="#6b7280"
              name="Principal"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="currentBalance"
              fill="#10b981"
              name="Current Balance"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="earnedInterest"
              fill="#f59e0b"
              name="Earned Interest"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#6b7280" }}
          ></div>
          <span className="text-sm text-zinc-300">Principal</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#10b981" }}
          ></div>
          <span className="text-sm text-zinc-300">Current Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#f59e0b" }}
          ></div>
          <span className="text-sm text-zinc-300">Earned Interest</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <p className="text-zinc-400">Total Deposits</p>
          <p className="text-white font-medium">{deposits.length}</p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">Total Principal</p>
          <p className="text-white font-medium">
            {summary.totalPrincipal.toLocaleString("ro-RO", {
              style: "currency",
              currency: "RON",
            })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">Total Earned</p>
          <p className="text-green-400 font-medium">
            {summary.totalEarnedInterest.toLocaleString("ro-RO", {
              style: "currency",
              currency: "RON",
            })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">Avg Return</p>
          <p
            className={`font-medium ${
              summary.totalReturnPercent >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {summary.totalReturnPercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
