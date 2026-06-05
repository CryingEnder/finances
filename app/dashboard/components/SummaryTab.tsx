"use client";

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
import {
  memo,
  useMemo,
  useState,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type {
  Etf,
  Currency,
  FundUnit,
  EtfSummary,
  FundUnitSummary,
} from "../../lib/types";

import { cn } from "../../lib/utils";
import { CURRENCIES } from "../../lib/currency";
import { useEtfs } from "../../lib/hooks/use-etfs";
import { useDeposits } from "../../lib/hooks/use-deposits";
import { useDividends } from "../../lib/hooks/use-dividends";
import { numberFormatLocale } from "../../lib/number-locale";
import { useFundUnits } from "../../lib/hooks/use-fund-units";
import { usePortfolioEntries } from "../../lib/hooks/use-portfolio";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { TAB_ICON_CLASS, TAB_COLORS as COLORS } from "../../lib/tab-colors";
import {
  profitReturnPercent,
  formatCurrencyDisplay,
  formatSignedCurrencyAmount,
} from "../../lib/currency-format";
import {
  summarizeEtfPosition,
  getLatestBuyTransaction,
  calculateEtfTransactionMetrics,
} from "../../lib/etf-utils";
import {
  getLatestBuyStatus,
  summarizeFundUnitPosition,
  calculateFundUnitStatusMetrics,
} from "../../lib/fund-unit-utils";
import {
  convertToRon,
  formatExchangeRate,
  type RonExchangeRates,
  FALLBACK_EXCHANGE_RATES_TO_RON,
} from "../../lib/currency-conversion";

interface SummaryPieRow {
  id: string;
  name: string;
  value: number;
  chartValue?: number;
  color: string;
  legendOrder?: number;
  originalValue?: number;
  originalCurrency?: Currency;
  [key: string]: string | number | undefined;
}

function pieSliceValue(row: SummaryPieRow): number {
  return row.chartValue ?? row.value;
}

function pieChartTotal(data: SummaryPieRow[]): number {
  return data.reduce((sum, row) => sum + pieSliceValue(row), 0);
}

function withPieSliceValues(data: SummaryPieRow[]): SummaryPieRow[] {
  return data.map((row) => ({
    ...row,
    sliceValue: pieSliceValue(row),
  }));
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
  displayInOriginalCurrency?: boolean;
  onDisplayInOriginalCurrencyChange?: (checked: boolean) => void;
  originalCurrencyCheckboxId?: string;
  useDefaultAmountTextColor?: boolean;
}

const DEFAULT_AMOUNT_TEXT_COLOR = "#fff";

function etfPieSliceColor(index: number, total: number): string {
  const hue = 243;
  const saturation = 75;
  if (total <= 1) {
    return COLORS.etfs;
  }
  const minLightness = 38;
  const maxLightness = 72;
  const lightness =
    minLightness + (index / (total - 1)) * (maxLightness - minLightness);
  return `hsl(${String(hue)}, ${String(saturation)}%, ${String(lightness)}%)`;
}

type CurrencySummaries<T> = Partial<Record<Currency, T>>;

function summarizeEtfs(rows: Etf[]): EtfSummary {
  let buyValue = 0;
  let totalSellValue = 0;
  let unrealizedProfit = 0;
  let realizedProfit = 0;
  let buyInvested = 0;
  let sellInvested = 0;

  for (const etf of rows) {
    const position = summarizeEtfPosition(etf);
    buyValue += position.buyValue;
    totalSellValue += position.totalSellValue;
    unrealizedProfit += position.unrealizedProfit;
    realizedProfit += position.realizedProfit;

    const latestBuy = getLatestBuyTransaction(etf);
    if (latestBuy) {
      buyInvested += calculateEtfTransactionMetrics(latestBuy).purchaseCost;
    }

    for (const transaction of etf.statuses) {
      if ("SELL" !== transaction.type) {
        continue;
      }
      sellInvested += calculateEtfTransactionMetrics(transaction).purchaseCost;
    }
  }

  return {
    buyValue,
    totalSellValue,
    unrealizedProfit,
    unrealizedProfitPercent:
      buyInvested > 0 ? (unrealizedProfit / buyInvested) * 100 : 0,
    realizedProfit,
    realizedProfitPercent:
      sellInvested > 0 ? (realizedProfit / sellInvested) * 100 : 0,
    buyInvested,
  };
}

function summarizeFundUnits(rows: FundUnit[]): FundUnitSummary {
  let buyValue = 0;
  let totalSellValue = 0;
  let unrealizedProfit = 0;
  let realizedProfit = 0;
  let buyInvested = 0;
  let latestBuyTotalValue = 0;
  let sellInvested = 0;

  for (const fundUnit of rows) {
    const position = summarizeFundUnitPosition(fundUnit);
    buyValue += position.buyValue;
    totalSellValue += position.totalSellValue;
    unrealizedProfit += position.unrealizedProfit;
    realizedProfit += position.realizedProfit;

    const latestBuy = getLatestBuyStatus(fundUnit);
    if (latestBuy) {
      buyInvested += latestBuy.totalValue - latestBuy.profit;
      latestBuyTotalValue += latestBuy.totalValue;
    }

    for (const status of fundUnit.statuses) {
      if ("SELL" !== status.type) {
        continue;
      }
      sellInvested += calculateFundUnitStatusMetrics(status).invested;
    }
  }

  return {
    buyValue,
    totalSellValue,
    unrealizedProfit,
    unrealizedProfitPercent:
      latestBuyTotalValue > 0
        ? (unrealizedProfit / latestBuyTotalValue) * 100
        : 0,
    realizedProfit,
    realizedProfitPercent:
      sellInvested > 0 ? (realizedProfit / sellInvested) * 100 : 0,
    buyInvested,
  };
}

function hasPositionSummary(summary: EtfSummary | FundUnitSummary): boolean {
  return (
    summary.buyValue > 0 ||
    summary.totalSellValue > 0 ||
    0 !== summary.unrealizedProfit ||
    0 !== summary.realizedProfit
  );
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
    return undefined !== summary && hasPositionSummary(summary);
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
                  summary.buyValue,
                  currency,
                  numberFormat,
                )}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
                <p>
                  {"etf" === variant ? t("costLabel") : t("investedLabel")}{" "}
                  {formatCurrencyDisplay(
                    summary.buyInvested,
                    currency,
                    numberFormat,
                  )}
                </p>
                <p>
                  {t("unrealizedLabel")}{" "}
                  <span
                    className={
                      summary.unrealizedProfit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {formatSignedCurrencyAmount(
                      summary.unrealizedProfit,
                      currency,
                      numberFormat,
                    )}
                    {"\u00A0("}
                    {summary.unrealizedProfitPercent.toFixed(2)}%)
                  </span>
                </p>
                <p>
                  {t("realizedLabel")}{" "}
                  <span
                    className={
                      summary.realizedProfit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {formatSignedCurrencyAmount(
                      summary.realizedProfit,
                      currency,
                      numberFormat,
                    )}
                    {"\u00A0("}
                    {summary.realizedProfitPercent.toFixed(2)}%)
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

interface SummaryExchangeRatesProps {
  rates: RonExchangeRates;
  rateDate: string | null;
  apiFailed: boolean;
}

function SummaryExchangeRates({
  rates,
  rateDate,
  apiFailed,
}: SummaryExchangeRatesProps) {
  const t = useTranslations("Summary");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);
  const usdRate = formatExchangeRate(rates.USD, numberFormat);
  const eurRate = formatExchangeRate(rates.EUR, numberFormat);
  const sourceLabel = apiFailed
    ? t("fxRatesApiFailed")
    : rateDate
      ? t("fxRatesBnrAsOf", { date: rateDate })
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      <p className="text-sm">
        <span className="text-zinc-200">{t("fxRatesLabel")}</span>
        {sourceLabel && (
          <span className={cn("text-zinc-400", apiFailed && "text-red-400")}>
            {" "}
            ({sourceLabel})
          </span>
        )}
      </p>
      <p className="text-sm text-zinc-300">
        {t("fxUsdToRon", { rate: usdRate })}
      </p>
      <p className="text-sm text-zinc-300">
        {t("fxEurToRon", { rate: eurRate })}
      </p>
    </div>
  );
}

function formatPieRowAmount(
  row: SummaryPieRow,
  displayInOriginalCurrency: boolean,
  numberFormat: string,
): string {
  if (
    displayInOriginalCurrency &&
    undefined !== row.originalValue &&
    undefined !== row.originalCurrency
  ) {
    return formatCurrencyDisplay(
      row.originalValue,
      row.originalCurrency,
      numberFormat,
    );
  }

  return formatCurrencyDisplay(row.value, "RON", numberFormat);
}

interface PieTooltipPayload {
  name: string;
  value: number;
  payload: SummaryPieRow;
}

interface SummaryPieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayload[];
  totalValue: number;
  valueLabel: string;
  displayInOriginalCurrency?: boolean;
  useDefaultAmountTextColor?: boolean;
}

function SummaryPieTooltip({
  active,
  payload,
  totalValue,
  valueLabel,
  displayInOriginalCurrency = false,
  useDefaultAmountTextColor = false,
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

  const sliceValue = pieSliceValue(data.payload);
  const percentage =
    totalValue > 0 ? ((sliceValue / totalValue) * 100).toFixed(1) : "0";

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{data.name}</p>
      <p
        className="text-sm"
        style={{
          color: useDefaultAmountTextColor
            ? DEFAULT_AMOUNT_TEXT_COLOR
            : data.payload.color,
        }}
      >
        {valueLabel}:{" "}
        {formatPieRowAmount(
          data.payload,
          displayInOriginalCurrency,
          numberFormat,
        )}
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
  displayInOriginalCurrency?: boolean;
  useDefaultAmountTextColor?: boolean;
}) {
  const {
    payload,
    displayInOriginalCurrency = false,
    useDefaultAmountTextColor = false,
  } = props;
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
        const fill =
          "string" === typeof item.color && item.color.length > 0
            ? item.color
            : (row?.color ?? "#71717a");
        const amountText =
          row !== undefined
            ? formatPieRowAmount(row, displayInOriginalCurrency, numberFormat)
            : formatCurrencyDisplay(0, "RON", numberFormat);

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
              <span
                style={{
                  color: useDefaultAmountTextColor
                    ? DEFAULT_AMOUNT_TEXT_COLOR
                    : undefined,
                }}
              >
                {amountText}
              </span>
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
          onClick={() => {
            onToggleItem(item.id);
          }}
          style={
            item.enabled
              ? { backgroundColor: item.color }
              : { color: item.color }
          }
          className={cn(
            "cursor-pointer rounded-full border py-1 text-xs font-medium transition-all",
            item.enabled ? "pl-3 pr-2" : "px-3",
            item.enabled
              ? "border-transparent text-white shadow-sm"
              : "border-zinc-600 bg-zinc-900/40 text-zinc-500 opacity-70",
          )}
        >
          <span className="inline-flex items-center gap-0.5">
            {item.label}
            {item.enabled && (
              <span
                aria-hidden
                className="text-[0.8125rem] leading-none opacity-80"
              >
                ×
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function SummaryPieOriginalCurrencyCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useTranslations("Summary");

  return (
    <div className="mb-4 flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="size-4 cursor-pointer rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-600"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-zinc-300">
        {t("pieEtfOriginalCurrency")}
      </label>
    </div>
  );
}

function SummaryDistributionPie({
  data,
  tooltipValueLabel,
  totalValue: _totalValue,
  title,
  toggleItems,
  onToggleItem,
  displayInOriginalCurrency = false,
  onDisplayInOriginalCurrencyChange,
  originalCurrencyCheckboxId,
  useDefaultAmountTextColor = false,
}: SummaryDistributionPieProps) {
  const t = useTranslations("Summary");

  const originalCurrencyControl =
    onDisplayInOriginalCurrencyChange && originalCurrencyCheckboxId ? (
      <SummaryPieOriginalCurrencyCheckbox
        id={originalCurrencyCheckboxId}
        checked={displayInOriginalCurrency}
        onChange={onDisplayInOriginalCurrencyChange}
      />
    ) : null;

  const chartTotal = pieChartTotal(data);
  const pieData = withPieSliceValues(data);

  if (0 === data.length || chartTotal <= 0) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 flex flex-col min-h-128">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {originalCurrencyControl}
        {toggleItems && onToggleItem && (
          <SummaryPieToggleBar
            items={toggleItems}
            onToggleItem={onToggleItem}
          />
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
      {originalCurrencyControl}
      {toggleItems && onToggleItem && (
        <SummaryPieToggleBar items={toggleItems} onToggleItem={onToggleItem} />
      )}
      <div className="h-112 min-h-112 w-full min-w-0 shrink-0">
        <ResponsiveContainer height={448} minWidth={0} width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={pieData}
              fill="#8884d8"
              cursor="default"
              labelLine={false}
              outerRadius={124}
              activeShape={false}
              dataKey="sliceValue"
              label={PieSliceLabel}
              isAnimationActive={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  fill={entry.color}
                  key={`cell-${entry.name}-${String(index)}`}
                  style={{ cursor: "default", outline: "none" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <SummaryPieTooltip
                  totalValue={chartTotal}
                  valueLabel={tooltipValueLabel}
                  displayInOriginalCurrency={displayInOriginalCurrency}
                  useDefaultAmountTextColor={useDefaultAmountTextColor}
                />
              }
            />
            <Legend
              content={(legendProps) => (
                <SummaryVerticalLegend
                  {...legendProps}
                  displayInOriginalCurrency={displayInOriginalCurrency}
                  useDefaultAmountTextColor={useDefaultAmountTextColor}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EtfAllocationPieCard({
  data,
  totalValue,
  title,
  tooltipValueLabel,
  useDefaultAmountTextColor = true,
}: {
  data: SummaryPieRow[];
  totalValue: number;
  title: string;
  tooltipValueLabel: string;
  useDefaultAmountTextColor?: boolean;
}) {
  const [displayInOriginalCurrency, setDisplayInOriginalCurrency] =
    useState(true);

  return (
    <SummaryDistributionPie
      data={data}
      title={title}
      totalValue={totalValue}
      tooltipValueLabel={tooltipValueLabel}
      displayInOriginalCurrency={displayInOriginalCurrency}
      useDefaultAmountTextColor={useDefaultAmountTextColor}
      originalCurrencyCheckboxId="summary-etf-pie-original-currency"
      onDisplayInOriginalCurrencyChange={setDisplayInOriginalCurrency}
    />
  );
}

const MemoizedSummaryDistributionPie = memo(SummaryDistributionPie);

export default function SummaryTab() {
  const t = useTranslations("Summary");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const { data: exchangeRatesData, isError: exchangeRatesError } =
    useExchangeRates();
  const ronExchangeRates =
    exchangeRatesData?.rates ?? FALLBACK_EXCHANGE_RATES_TO_RON;
  const exchangeRateDate = exchangeRatesData?.rateDate ?? null;
  const exchangeRatesApiFailed =
    exchangeRatesError || "fallback" === exchangeRatesData?.source;

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
      summaries[currency] = summarizeEtfs(rows);
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
        summaries[currency] = summarizeFundUnits(rows);
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
      invested += convertToRon(summary.buyInvested, currency, ronExchangeRates);
      currentValue += convertToRon(
        summary.buyValue,
        currency,
        ronExchangeRates,
      );
      profit += convertToRon(
        summary.unrealizedProfit + summary.realizedProfit,
        currency,
        ronExchangeRates,
      );
    }

    return { invested, currentValue, profit };
  }, [etfSummariesByCurrency, ronExchangeRates]);

  const fundUnitsInRon = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let profit = 0;

    for (const currency of CURRENCIES) {
      const summary = fundUnitSummariesByCurrency[currency];
      if (!summary) {
        continue;
      }
      invested += convertToRon(summary.buyInvested, currency, ronExchangeRates);
      currentValue += convertToRon(
        summary.buyValue,
        currency,
        ronExchangeRates,
      );
      profit += convertToRon(
        summary.unrealizedProfit + summary.realizedProfit,
        currency,
        ronExchangeRates,
      );
    }

    return { invested, currentValue, profit };
  }, [fundUnitSummariesByCurrency, ronExchangeRates]);

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
      _hiddenIds: Set<string>,
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
    const buyFundUnits = fundUnits.flatMap((unit) => {
      const latestBuy = getLatestBuyStatus(unit);
      return latestBuy ? [{ unit, latestBuy }] : [];
    });

    if (0 === buyFundUnits.length) {
      return null;
    }

    let bondsValue = 0;
    let stocksValue = 0;
    for (const { unit, latestBuy } of buyFundUnits) {
      const valueRon = convertToRon(
        latestBuy.totalValue,
        unit.currency,
        ronExchangeRates,
      );
      bondsValue += valueRon * (unit.bondsPercent / 100);
      stocksValue += valueRon * ((100 - unit.bondsPercent) / 100);
    }

    if (bondsValue + stocksValue <= 0) {
      return null;
    }

    return { bondsValue, stocksValue };
  }, [fundUnits, ronExchangeRates]);

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

  const pieEtfAllocationData = useMemo((): SummaryPieRow[] => {
    const rows = etfs
      .flatMap((etf): SummaryPieRow[] => {
        const latestBuy = getLatestBuyTransaction(etf);
        if (!latestBuy) {
          return [];
        }
        const purchaseCost =
          calculateEtfTransactionMetrics(latestBuy).purchaseCost;
        const valueRon = convertToRon(
          purchaseCost,
          etf.currency,
          ronExchangeRates,
        );
        if (valueRon <= 0) {
          return [];
        }
        return [
          {
            id: etf._id ?? etf.symbol,
            name: etf.label,
            value: valueRon,
            originalValue: purchaseCost,
            originalCurrency: etf.currency,
            color: COLORS.etfs,
            legendOrder: 0,
          },
        ];
      })
      .sort((a, b) => b.value - a.value);

    return rows.map((row, index) => ({
      ...row,
      color: etfPieSliceColor(index, rows.length),
      legendOrder: index + 1,
    }));
  }, [etfs, ronExchangeRates]);

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

  const pieEtfAllocationTotal = useMemo(
    () => pieEtfAllocationData.reduce((s, r) => s + r.value, 0),
    [pieEtfAllocationData],
  );

  const hasEtfSections = CURRENCIES.some((currency) => {
    const currencySummary = etfSummariesByCurrency[currency];
    return (
      undefined !== currencySummary && hasPositionSummary(currencySummary)
    );
  });
  const hasFundUnitSections = CURRENCIES.some((currency) => {
    const currencySummary = fundUnitSummariesByCurrency[currency];
    return (
      undefined !== currencySummary && hasPositionSummary(currencySummary)
    );
  });

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
        <SummaryExchangeRates
          rates={ronExchangeRates}
          rateDate={exchangeRateDate}
          apiFailed={exchangeRatesApiFailed}
        />

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
                  <TrendingUp
                    className={`h-5 w-5 ${TAB_ICON_CLASS.fundUnits}`}
                  />
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
            <MemoizedSummaryDistributionPie
              data={pieBasisData}
              totalValue={pieBasisTotal}
              title={t("pieInvestedTitle")}
              tooltipValueLabel={t("amount")}
              toggleItems={pieBasisToggleItems}
              onToggleItem={(id) => {
                togglePieItem(
                  id,
                  pieBasisDataAll,
                  basisHiddenIds,
                  setBasisHiddenIds,
                );
              }}
            />
            <MemoizedSummaryDistributionPie
              data={pieWealthData}
              title={t("pieWealthTitle")}
              totalValue={pieWealthTotal}
              tooltipValueLabel={t("amount")}
              toggleItems={pieWealthToggleItems}
              onToggleItem={(id) => {
                togglePieItem(
                  id,
                  pieWealthDataAll,
                  wealthHiddenIds,
                  setWealthHiddenIds,
                );
              }}
            />
          </div>
          {(pieEtfAllocationTotal > 0 || fundAllocation) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pieEtfAllocationTotal > 0 && (
                <EtfAllocationPieCard
                  useDefaultAmountTextColor
                  data={pieEtfAllocationData}
                  tooltipValueLabel={t("amount")}
                  title={t("pieEtfAllocationTitle")}
                  totalValue={pieEtfAllocationTotal}
                />
              )}
              {fundAllocation && (
                <MemoizedSummaryDistributionPie
                  useDefaultAmountTextColor
                  data={pieFundAllocationData}
                  tooltipValueLabel={t("amount")}
                  title={t("pieFundAllocationTitle")}
                  totalValue={pieFundAllocationTotal}
                />
              )}
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
