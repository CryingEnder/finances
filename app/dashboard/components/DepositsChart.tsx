"use client";

import { TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import type { DepositSummary, DepositWithCalculations } from "../../lib/types";

import { numberFormatLocale } from "../../lib/number-locale";

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function DepositsBarTooltipInner({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  const t = useTranslations("DepositsChart");
  const locale = useLocale();
  const nf = numberFormatLocale(locale);

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry, index) => {
        const key = entry.dataKey;
        const readableLabel =
          "principal" === key ||
          "currentBalance" === key ||
          "earnedInterest" === key
            ? t(key)
            : key;

        return (
          <p
            className="text-sm"
            key={String(index)}
            style={{ color: entry.color }}
          >
            {readableLabel}:{" "}
            {entry.value.toLocaleString(nf, {
              style: "currency",
              currency: "RON",
            })}
          </p>
        );
      })}
    </div>
  );
}

interface DepositsChartProps {
  deposits: DepositWithCalculations[];
  summary: DepositSummary;
}

export default function DepositsChart({
  deposits,
  summary,
}: DepositsChartProps) {
  const t = useTranslations("DepositsChart");
  const locale = useLocale();
  const nf = numberFormatLocale(locale);

  const barChartData = deposits.map((deposit) => ({
    name: `${deposit.bank} - ${deposit.depositName}`.substring(0, 20),
    principal: deposit.principal,
    currentBalance: deposit.currentBalance,
    earnedInterest: deposit.earnedInterest,
    returnPercent: deposit.totalReturnPercent,
  }));

  if (0 === deposits.length) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-8">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-zinc-500 opacity-50" />
          <p className="text-zinc-400">{t("noData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t("title")}
        </h3>
      </div>

      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer height={384} minWidth={0} width="100%">
          <BarChart
            data={barChartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 0,
            }}
          >
            <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
            <XAxis
              angle={0}
              height={100}
              fontSize={12}
              dataKey="name"
              stroke="#9ca3af"
              textAnchor="middle"
            />
            <YAxis
              fontSize={12}
              stroke="#9ca3af"
              tickFormatter={(value) =>
                Number(value).toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                  minimumFractionDigits: 0,
                })
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(63, 63, 70, 0.3)" }}
              content={(tooltipProps) => (
                <DepositsBarTooltipInner
                  active={tooltipProps.active}
                  payload={
                    tooltipProps.payload as TooltipPayloadEntry[] | undefined
                  }
                  label={
                    "string" === typeof tooltipProps.label
                      ? tooltipProps.label
                      : undefined
                  }
                />
              )}
            />
            <Bar
              fill="#6b7280"
              dataKey="principal"
              name={t("principal")}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              fill="#10b981"
              radius={[2, 2, 0, 0]}
              dataKey="currentBalance"
              name={t("currentBalance")}
            />
            <Bar
              fill="#f59e0b"
              radius={[2, 2, 0, 0]}
              dataKey="earnedInterest"
              name={t("earnedInterest")}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#6b7280" }}
          />
          <span className="text-sm text-zinc-300">{t("principal")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#10b981" }}
          />
          <span className="text-sm text-zinc-300">{t("currentBalance")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span className="text-sm text-zinc-300">{t("earnedInterest")}</span>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <p className="text-zinc-400">{t("totalTermDeposits")}</p>
          <p className="text-white font-medium">{deposits.length}</p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">{t("summaryTotalPrincipal")}</p>
          <p className="text-white font-medium">
            {summary.totalPrincipal.toLocaleString(nf, {
              style: "currency",
              currency: "RON",
            })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">{t("totalEarned")}</p>
          <p className="text-green-400 font-medium">
            {summary.totalEarnedInterest.toLocaleString(nf, {
              style: "currency",
              currency: "RON",
            })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400">{t("avgReturn")}</p>
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
