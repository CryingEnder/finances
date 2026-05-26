"use client";

import { useCallback, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Coins, Landmark, LineChart, TrendingUp } from "lucide-react";
import {
  Pie,
  Cell,
  Legend,
  Tooltip,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import type {
  Etf,
  Currency,
  FundUnit,
  EtfSummary,
  FundUnitSummary,
} from "../../lib/types";

import { CURRENCIES } from "../../lib/currency";
import { useEtfs } from "../../lib/hooks/use-etfs";
import { useDeposits } from "../../lib/hooks/use-deposits";
import { useDividends } from "../../lib/hooks/use-dividends";
import { numberFormatLocale } from "../../lib/number-locale";
import { useFundUnits } from "../../lib/hooks/use-fund-units";
import { TAB_COLORS, TAB_ICON_CLASS } from "../../lib/tab-colors";
import { usePortfolioEntries } from "../../lib/hooks/use-portfolio";
import {
  convertToRon,
  formatEurToRonRate,
  formatUsdToRonRate,
} from "../../lib/currency-conversion";
import {
  profitReturnPercent,
  formatCurrencyDisplay,
  formatSignedCurrencyAmount,
} from "../../lib/currency-format";
import { cn } from "../../lib/utils";

interface SummaryPieRow {
  id: string;
  name: string;
  value: number;
  color: string;
  legendOrder?: number;
  [key: string]: string | number | undefined;
}

interface PieToggleItem {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
}

interface SummaryDistributionPieProps {
  data: SummaryPieRow[];
  tooltipValueLabel: string;
  totalValue: number;
  title: string;
  toggleItems?: PieToggleItem[];
  onToggleItem?: (id: string) => void;
}

const COLORS = TAB_COLORS;

type CurrencySummaries<T> = Partial<Record<Currency, T>>;

function summarizeEtfs(rows: Etf[]): EtfSummary {
  return rows.reduce(
    (acc, etf) => {
      const purchaseCost = etf.volume * etf.openingPrice;
      const value = etf.volume * etf.actualPrice;
      const profitNet = value - purchaseCost;
      return {
        totalValue: acc.totalValue + value,
        totalPurchaseCost: acc.totalPurchaseCost + purchaseCost,
        totalProfitNet: acc.totalProfitNet + profitNet,
        totalProfitNetPercent: 0,
      };
    },
    {
      totalValue: 0,
      totalPurchaseCost: 0,
      totalProfitNet: 0,
      totalProfitNetPercent: 0,
    },
  );
}

function summarizeFundUnits(rows: FundUnit[]): FundUnitSummary {
  return rows.reduce(
    (acc, row) => {
      const invested = row.totalValue - row.profit;
      return {
        totalValue: acc.totalValue + row.totalValue,
        totalInvested: acc.totalInvested + invested,
        totalProfit: acc.totalProfit + row.profit,
        totalProfitPercent: 0,
      };
    },
    {
      totalValue: 0,
      totalInvested: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
    },
  );
}

function withProfitPercent(
  summary: EtfSummary,
  profit: number,
  basis: number,
): EtfSummary {
  return {
    ...summary,
    totalProfitNetPercent: basis > 0 ? (profit / basis) * 100 : 0,
  };
}

function withFundProfitPercent(summary: FundUnitSummary): FundUnitSummary {
  return {
    ...summary,
    totalProfitPercent:
      summary.totalValue > 0
        ? (summary.totalProfit / summary.totalValue) * 100
        : 0,
  };
}

function groupByCurrency<T extends { currency: Currency }>(
  items: T[],
): Record<Currency, T[]> {
  const grouped: Record<Currency, T[]> = { EUR: [], USD: [], RON: [] };
  for (const item of items) {
    grouped[item.currency].push(item);
  }
  return grouped;
}

interface CurrencyBreakdownProps {
  title: string;
  icon: ReactNode;
  summaries: CurrencySummaries<EtfSummary | FundUnitSummary>;
  variant: "etf" | "fundUnit";
  ronInvested: number;
  ronCurrentValue: number;
}

function CurrencyBreakdown({
  title,
  icon,
  summaries,
  variant,
  ronInvested,
  ronCurrentValue,
}: CurrencyBreakdownProps) {
  const t = useTranslations("Summary");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const sections = CURRENCIES.filter((currency) => {
    const summary = summaries[currency];
    return undefined !== summary && summary.totalValue > 0;
  });

  if (0 === sections.length) {
    return null;
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{title}</p>
        {icon}
      </div>
      <div className="space-y-4">
        {sections.map((currency) => {
          const summary = summaries[currency];
          if (!summary) {
            return null;
          }

          const invested =
            "etf" === variant
              ? (summary as EtfSummary).totalPurchaseCost
              : (summary as FundUnitSummary).totalInvested;
          const profit =
            "etf" === variant
              ? (summary as EtfSummary).totalProfitNet
              : (summary as FundUnitSummary).totalProfit;
          const profitPercent =
            "etf" === variant
              ? (summary as EtfSummary).totalProfitNetPercent
              : (summary as FundUnitSummary).totalProfitPercent;

          return (
            <div
              key={currency}
              className="border-t border-zinc-700/80 pt-3 first:border-t-0 first:pt-0"
            >
              <span className="mb-2 inline-block rounded border border-zinc-600 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                {currency}
              </span>
              <p className="text-xl font-bold text-white">
                {formatCurrencyDisplay(
                  summary.totalValue,
                  currency,
                  numberFormat,
                )}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
                <p>
                  {"etf" === variant ? t("costLabel") : t("investedLabel")}{" "}
                  {formatCurrencyDisplay(invested, currency, numberFormat)}
                </p>
                <p>
                  {t("profitLabel")}{" "}
                  <span
                    className={profit >= 0 ? "text-green-400" : "text-red-400"}
                  >
                    {formatSignedCurrencyAmount(profit, currency, numberFormat)}
                    {"\u00A0("}
                    {profitPercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {(ronInvested > 0 || ronCurrentValue > 0) && (
        <div className="mt-4 border-t border-zinc-700/80 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("ronTotalSubtitle")}
          </p>
          <div className="space-y-0.5 text-xs text-zinc-400">
            <p>
              {"etf" === variant ? t("ronCostLabel") : t("ronInvestedLabel")}{" "}
              {formatCurrencyDisplay(ronInvested, "RON", numberFormat)}
            </p>
            <p>
              {t("ronValueLabel")}{" "}
              <span className="font-medium text-white">
                {formatCurrencyDisplay(ronCurrentValue, "RON", numberFormat)}
                {ronInvested > 0 && (
                  <>
                    {"\u00A0("}
                    {profitReturnPercent(
                      ronCurrentValue - ronInvested,
                      ronInvested,
                    ).toFixed(2)}
                    %)
                  </>
                )}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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

function SummaryExchangeRates() {
  const t = useTranslations("Summary");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);
  const usdRate = formatUsdToRonRate(numberFormat);
  const eurRate = formatEurToRonRate(numberFormat);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      <p className="text-sm text-zinc-400">{t("fxRatesLabel")}</p>
      <p className="text-sm text-zinc-300">
        {t("fxUsdToRon", { rate: usdRate })}
      </p>
      <p className="text-sm text-zinc-300">
        {t("fxEurToRon", { rate: eurRate })}
      </p>
    </div>
  );
}

function SummaryPieTooltip({
  active,
  payload,
  totalValue,
  valueLabel,
}: SummaryPieTooltipProps) {
  const tc = useTranslations("Common");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

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
        {valueLabel}: {formatCurrencyDisplay(data.value, "RON", numberFormat)}
      </p>
      <p className="text-sm text-zinc-400">
        {tc("percentage")}: {percentage}%
      </p>
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
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  if (!payload?.length) {
    return null;
  }

  const sortedPayload = [...payload].sort((a, b) => {
    const aOrder = (a.payload as SummaryPieRow | undefined)?.legendOrder ?? 999;
    const bOrder = (b.payload as SummaryPieRow | undefined)?.legendOrder ?? 999;
    return aOrder - bOrder;
  });

  return (
    <div className="mt-3 flex w-full flex-col items-start gap-2.5 px-2">
      {sortedPayload.map((item, i) => {
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
              {label}: {formatCurrencyDisplay(amount, "RON", numberFormat)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryPieToggleBar({
  items,
  onToggleItem,
}: {
  items: PieToggleItem[];
  onToggleItem: (id: string) => void;
}) {
  if (0 === items.length) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.enabled}
          onClick={() => onToggleItem(item.id)}
          className={cn(
            "cursor-pointer rounded-full border py-1 text-xs font-medium transition-all",
            item.enabled ? "pl-3 pr-2" : "px-3",
            item.enabled
              ? "border-transparent text-white shadow-sm"
              : "border-zinc-600 bg-zinc-900/40 text-zinc-500 opacity-70",
          )}
          style={
            item.enabled ? { backgroundColor: item.color } : { color: item.color }
          }
        >
          <span className="inline-flex items-center gap-0.5">
            {item.label}
            {item.enabled && (
              <span aria-hidden className="text-[0.8125rem] leading-none opacity-80">
                ×
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function SummaryDistributionPie({
  data,
  tooltipValueLabel,
  totalValue,
  title,
  toggleItems,
  onToggleItem,
}: SummaryDistributionPieProps) {
  const t = useTranslations("Summary");

  if (0 === data.length || totalValue <= 0) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 flex flex-col min-h-128">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {toggleItems && onToggleItem && (
          <SummaryPieToggleBar items={toggleItems} onToggleItem={onToggleItem} />
        )}
        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12">
          <p className="text-sm text-zinc-500 text-center px-4">
            {t("pieNothing")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 flex flex-col min-h-128">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {toggleItems && onToggleItem && (
        <SummaryPieToggleBar items={toggleItems} onToggleItem={onToggleItem} />
      )}
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
  const t = useTranslations("Summary");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const { data: deposits = [], isLoading: depositsLoading } = useDeposits();
  const { data: portfolioEntries = [], isLoading: portfolioLoading } =
    usePortfolioEntries();
  const { data: dividends = [], isLoading: dividendsLoading } = useDividends();
  const { data: etfs = [], isLoading: etfsLoading } = useEtfs();
  const { data: fundUnits = [], isLoading: fundUnitsLoading } = useFundUnits();

  const etfSummariesByCurrency = useMemo((): CurrencySummaries<EtfSummary> => {
    const grouped = groupByCurrency(etfs);
    const summaries: CurrencySummaries<EtfSummary> = {};

    for (const currency of CURRENCIES) {
      const rows = grouped[currency];
      if (0 === rows.length) {
        continue;
      }
      const summary = summarizeEtfs(rows);
      summaries[currency] = withProfitPercent(
        summary,
        summary.totalProfitNet,
        summary.totalPurchaseCost,
      );
    }

    return summaries;
  }, [etfs]);

  const fundUnitSummariesByCurrency =
    useMemo((): CurrencySummaries<FundUnitSummary> => {
      const grouped = groupByCurrency(fundUnits);
      const summaries: CurrencySummaries<FundUnitSummary> = {};

      for (const currency of CURRENCIES) {
        const rows = grouped[currency];
        if (0 === rows.length) {
          continue;
        }
        summaries[currency] = withFundProfitPercent(summarizeFundUnits(rows));
      }

      return summaries;
    }, [fundUnits]);

  const etfsInRon = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let profit = 0;

    for (const currency of CURRENCIES) {
      const summary = etfSummariesByCurrency[currency];
      if (!summary) {
        continue;
      }
      // TODO: Replace convertToRon with live API rates when available.
      invested += convertToRon(summary.totalPurchaseCost, currency);
      currentValue += convertToRon(summary.totalValue, currency);
      profit += convertToRon(summary.totalProfitNet, currency);
    }

    return { invested, currentValue, profit };
  }, [etfSummariesByCurrency]);

  const fundUnitsInRon = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let profit = 0;

    for (const currency of CURRENCIES) {
      const summary = fundUnitSummariesByCurrency[currency];
      if (!summary) {
        continue;
      }
      // TODO: Replace convertToRon with live API rates when available.
      invested += convertToRon(summary.totalInvested, currency);
      currentValue += convertToRon(summary.totalValue, currency);
      profit += convertToRon(summary.totalProfit, currency);
    }

    return { invested, currentValue, profit };
  }, [fundUnitSummariesByCurrency]);

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

    const totalCurrentValue =
      totalDepositsCurrentValue +
      stocksCurrentValue +
      etfsInRon.currentValue +
      fundUnitsInRon.currentValue;

    const totalInvested =
      totalDepositsInvested +
      stocksInvestedValue +
      etfsInRon.invested +
      fundUnitsInRon.invested;

    const depositsProfit = totalDepositsCurrentValue - totalDepositsInvested;
    const stocksUnrealizedProfit = stocksCurrentValue - stocksInvestedValue;
    const totalProfit =
      depositsProfit +
      stocksUnrealizedProfit +
      etfsInRon.profit +
      fundUnitsInRon.profit;

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
  }, [deposits, portfolioEntries, etfsInRon, fundUnitsInRon]);

  const totalDividends = useMemo(
    () => dividends.reduce((sum, d) => sum + d.amount, 0),
    [dividends],
  );

  const totalProfitWithDividends = useMemo(
    () => summary.totalProfit + totalDividends,
    [summary.totalProfit, totalDividends],
  );

  const [basisHiddenIds, setBasisHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [wealthHiddenIds, setWealthHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );

  const togglePieItem = useCallback(
    (
      id: string,
      allRows: SummaryPieRow[],
      hiddenIds: Set<string>,
      setHiddenIds: Dispatch<SetStateAction<Set<string>>>,
    ) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }

        const visibleCount = allRows.filter((row) => !prev.has(row.id)).length;
        if (visibleCount <= 1) {
          return prev;
        }

        next.add(id);
        return next;
      });
    },
    [],
  );

  const pieBasisDataAll = useMemo((): SummaryPieRow[] => {
    return [
      {
        id: "stocks",
        name: t("pieStocksCost"),
        value: summary.stocksInvestedValue,
        color: COLORS.stocks,
        legendOrder: 1,
      },
      {
        id: "deposits",
        name: t("pieTermDepositsPrincipal"),
        value: summary.totalDepositsInvested,
        color: COLORS.deposits,
        legendOrder: 2,
      },
      {
        id: "etfs",
        name: t("pieEtfsCost"),
        value: etfsInRon.invested,
        color: COLORS.etfs,
        legendOrder: 3,
      },
      {
        id: "fundUnits",
        name: t("pieFundUnitsInvested"),
        value: fundUnitsInRon.invested,
        color: COLORS.fundUnits,
        legendOrder: 4,
      },
    ].filter((item) => item.value > 0);
  }, [summary, etfsInRon.invested, fundUnitsInRon.invested, t]);

  const pieWealthDataAll = useMemo((): SummaryPieRow[] => {
    return [
      {
        id: "dividends",
        name: t("pieDividendsCumulative"),
        value: totalDividends,
        color: COLORS.dividends,
        legendOrder: 0,
      },
      {
        id: "stocks",
        name: t("pieStocksMarket"),
        value: summary.stocksCurrentValue,
        color: COLORS.stocks,
        legendOrder: 1,
      },
      {
        id: "deposits",
        name: t("pieTermDepositsWithInterest"),
        value: summary.totalDepositsCurrentValue,
        color: COLORS.deposits,
        legendOrder: 2,
      },
      {
        id: "etfs",
        name: t("pieEtfsValue"),
        value: etfsInRon.currentValue,
        color: COLORS.etfs,
        legendOrder: 3,
      },
      {
        id: "fundUnits",
        name: t("pieFundUnitsValue"),
        value: fundUnitsInRon.currentValue,
        color: COLORS.fundUnits,
        legendOrder: 4,
      },
    ].filter((item) => item.value > 0);
  }, [
    summary,
    etfsInRon.currentValue,
    fundUnitsInRon.currentValue,
    totalDividends,
    t,
  ]);

  const pieBasisData = useMemo(
    () => pieBasisDataAll.filter((row) => !basisHiddenIds.has(row.id)),
    [pieBasisDataAll, basisHiddenIds],
  );

  const pieWealthData = useMemo(
    () => pieWealthDataAll.filter((row) => !wealthHiddenIds.has(row.id)),
    [pieWealthDataAll, wealthHiddenIds],
  );

  const pieBasisToggleItems = useMemo(
    (): PieToggleItem[] =>
      pieBasisDataAll.map((row) => ({
        id: row.id,
        label: row.name,
        color: row.color,
        enabled: !basisHiddenIds.has(row.id),
      })),
    [pieBasisDataAll, basisHiddenIds],
  );

  const pieWealthToggleItems = useMemo(
    (): PieToggleItem[] =>
      pieWealthDataAll.map((row) => ({
        id: row.id,
        label: row.name,
        color: row.color,
        enabled: !wealthHiddenIds.has(row.id),
      })),
    [pieWealthDataAll, wealthHiddenIds],
  );

  const fundAllocation = useMemo(() => {
    if (0 === fundUnits.length || fundUnitsInRon.currentValue <= 0) {
      return null;
    }

    const avgBondsPercent =
      fundUnits.reduce((sum, unit) => sum + unit.bondsPercent, 0) /
      fundUnits.length;
    const avgStocksPercent = 100 - avgBondsPercent;
    const totalRon = fundUnitsInRon.currentValue;

    return {
      avgBondsPercent,
      avgStocksPercent,
      totalRon,
      bondsValue: totalRon * (avgBondsPercent / 100),
      stocksValue: totalRon * (avgStocksPercent / 100),
    };
  }, [fundUnits, fundUnitsInRon.currentValue]);

  const pieFundAllocationData = useMemo((): SummaryPieRow[] => {
    if (!fundAllocation) {
      return [];
    }

    return [
      {
        id: "bonds",
        name: t("pieBonds"),
        value: fundAllocation.bondsValue,
        color: COLORS.bonds,
        legendOrder: 1,
      },
      {
        id: "stocks",
        name: t("pieStocks"),
        value: fundAllocation.stocksValue,
        color: COLORS.stocks,
        legendOrder: 2,
      },
    ].filter((item) => item.value > 0);
  }, [fundAllocation, t]);

  const pieBasisTotal = useMemo(
    () => pieBasisData.reduce((s, r) => s + r.value, 0),
    [pieBasisData],
  );

  const pieWealthTotal = useMemo(
    () => pieWealthData.reduce((s, r) => s + r.value, 0),
    [pieWealthData],
  );

  const pieFundAllocationTotal = useMemo(
    () => pieFundAllocationData.reduce((s, r) => s + r.value, 0),
    [pieFundAllocationData],
  );

  const hasEtfSections = CURRENCIES.some(
    (currency) => (etfSummariesByCurrency[currency]?.totalValue ?? 0) > 0,
  );
  const hasFundUnitSections = CURRENCIES.some(
    (currency) => (fundUnitSummariesByCurrency[currency]?.totalValue ?? 0) > 0,
  );

  if (
    depositsLoading ||
    portfolioLoading ||
    dividendsLoading ||
    etfsLoading ||
    fundUnitsLoading
  ) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-zinc-400">{t("loading")}</p>
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
        <SummaryExchangeRates />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">{t("stocks")}</p>
              <TrendingUp className={`w-5 h-5 ${TAB_ICON_CLASS.stocks}`} />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrencyDisplay(
                summary.stocksCurrentValue,
                "RON",
                numberFormat,
              )}
            </p>
            <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
              <p>
                {t("investedLabel")}{" "}
                {formatCurrencyDisplay(
                  summary.stocksInvestedValue,
                  "RON",
                  numberFormat,
                )}
              </p>
              <p>
                {t("unrealizedLabel")}{" "}
                <span
                  className={
                    summary.stocksUnrealizedProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {formatSignedCurrencyAmount(
                    summary.stocksUnrealizedProfit,
                    "RON",
                    numberFormat,
                  )}
                  {summary.stocksInvestedValue > 0 && (
                    <>
                      {"\u00A0("}
                      {profitReturnPercent(
                        summary.stocksUnrealizedProfit,
                        summary.stocksInvestedValue,
                      ).toFixed(2)}
                      %)
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">{t("termDeposits")}</p>
              <Landmark className={`w-5 h-5 ${TAB_ICON_CLASS.deposits}`} />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrencyDisplay(
                summary.totalDepositsCurrentValue,
                "RON",
                numberFormat,
              )}
            </p>
            <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
              <p>
                {t("principalLabel")}{" "}
                {formatCurrencyDisplay(
                  summary.totalDepositsInvested,
                  "RON",
                  numberFormat,
                )}
              </p>
              <p>
                {t("profitLabel")}{" "}
                <span
                  className={
                    summary.depositsProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {formatSignedCurrencyAmount(
                    summary.depositsProfit,
                    "RON",
                    numberFormat,
                  )}
                  {summary.totalDepositsInvested > 0 && (
                    <>
                      {"\u00A0("}
                      {profitReturnPercent(
                        summary.depositsProfit,
                        summary.totalDepositsInvested,
                      ).toFixed(2)}
                      %)
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {(hasEtfSections || hasFundUnitSections) && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              hasEtfSections && hasFundUnitSections ? "lg:grid-cols-2" : ""
            }`}
          >
            {hasFundUnitSections && (
              <CurrencyBreakdown
                variant="fundUnit"
                title={t("fundUnits")}
                ronInvested={fundUnitsInRon.invested}
                summaries={fundUnitSummariesByCurrency}
                ronCurrentValue={fundUnitsInRon.currentValue}
                icon={
                  <TrendingUp className={`h-5 w-5 ${TAB_ICON_CLASS.fundUnits}`} />
                }
              />
            )}
            {hasEtfSections && (
              <CurrencyBreakdown
                variant="etf"
                title={t("etfs")}
                ronInvested={etfsInRon.invested}
                summaries={etfSummariesByCurrency}
                ronCurrentValue={etfsInRon.currentValue}
                icon={
                  <LineChart className={`h-5 w-5 ${TAB_ICON_CLASS.etfs}`} />
                }
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-zinc-400 text-sm">
                    {t("totalCurrentValue")}{" "}
                    <span className="text-zinc-500">
                      ({t("excludingDividends").toLowerCase()})
                    </span>
                  </p>
                  <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                    RON
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyDisplay(
                    summary.totalCurrentValue,
                    "RON",
                    numberFormat,
                  )}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("investedLabel")}{" "}
                    {formatCurrencyDisplay(
                      summary.totalInvested,
                      "RON",
                      numberFormat,
                    )}
                  </p>
                )}
              </div>
              <div className="border-t border-zinc-700/80 pt-3">
                <p className="mb-2 text-sm text-zinc-400">{t("dividends")}</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyDisplay(totalDividends, "RON", numberFormat)}
                </p>
                {0 === dividends.length && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("noRecordsYet")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">{t("totalProfit")}</p>
              <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                RON
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-zinc-500">
                  {t("excludingDividends")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatSignedCurrencyAmount(
                    summary.totalProfit,
                    "RON",
                    numberFormat,
                  )}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {(
                      (summary.totalProfit / summary.totalInvested) *
                      100
                    ).toFixed(2)}
                    {t("pctReturn")}
                  </p>
                )}
              </div>
              <div className="border-t border-zinc-700/80 pt-3">
                <p className="mb-1 text-xs text-zinc-500">
                  {t("includingDividends")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    totalProfitWithDividends >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatSignedCurrencyAmount(
                    totalProfitWithDividends,
                    "RON",
                    numberFormat,
                  )}
                </p>
                {summary.totalInvested > 0 && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {(
                      (totalProfitWithDividends / summary.totalInvested) *
                      100
                    ).toFixed(2)}
                    {t("pctReturn")}
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
              totalValue={pieBasisTotal}
              title={t("pieInvestedTitle")}
              tooltipValueLabel={t("amount")}
              toggleItems={pieBasisToggleItems}
              onToggleItem={(id) =>
                togglePieItem(
                  id,
                  pieBasisDataAll,
                  basisHiddenIds,
                  setBasisHiddenIds,
                )
              }
            />
            <SummaryDistributionPie
              data={pieWealthData}
              title={t("pieWealthTitle")}
              totalValue={pieWealthTotal}
              tooltipValueLabel={t("amount")}
              toggleItems={pieWealthToggleItems}
              onToggleItem={(id) =>
                togglePieItem(
                  id,
                  pieWealthDataAll,
                  wealthHiddenIds,
                  setWealthHiddenIds,
                )
              }
            />
          </div>
          {fundAllocation && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SummaryDistributionPie
                data={pieFundAllocationData}
                totalValue={pieFundAllocationTotal}
                title={t("pieFundAllocationTitle")}
                tooltipValueLabel={t("amount")}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <Coins className="mx-auto mb-6 h-16 w-16 text-zinc-500 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">
              {t("emptyTitle")}
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              {t("emptyBody")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
