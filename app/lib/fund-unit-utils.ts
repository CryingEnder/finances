import type {
  FundUnit,
  FundUnitStatus,
  FundUnitPositionSummary,
} from "./types";

import { toIsoDateOnly } from "./dates";

export function sortFundUnitStatusesByNewest(
  statuses: FundUnitStatus[],
): FundUnitStatus[] {
  return [...statuses].sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestBuyStatus(
  fundUnit: FundUnit,
): FundUnitStatus | undefined {
  const buys = fundUnit.statuses.filter((status) => "BUY" === status.type);
  if (0 === buys.length) {
    return undefined;
  }
  return sortFundUnitStatusesByNewest(buys)[0];
}

export function calculateFundUnitStatusMetrics(status: FundUnitStatus) {
  const invested = status.totalValue - status.profit;
  const profitPercent =
    status.totalValue > 0 ? (status.profit / status.totalValue) * 100 : 0;

  return { invested, profitPercent };
}

export function summarizeFundUnitPosition(
  fundUnit: FundUnit,
): FundUnitPositionSummary {
  const latestBuy = getLatestBuyStatus(fundUnit);

  let totalSellValue = 0;
  let realizedProfit = 0;
  let sellInvested = 0;

  for (const status of fundUnit.statuses) {
    if ("SELL" !== status.type) {
      continue;
    }

    const metrics = calculateFundUnitStatusMetrics(status);
    totalSellValue += status.totalValue;
    realizedProfit += status.profit;
    sellInvested += metrics.invested;
  }

  return {
    buyValue: latestBuy?.totalValue ?? 0,
    totalSellValue,
    unrealizedProfit: latestBuy?.profit ?? 0,
    unrealizedProfitPercent:
      latestBuy && latestBuy.totalValue > 0
        ? (latestBuy.profit / latestBuy.totalValue) * 100
        : 0,
    realizedProfit,
    realizedProfitPercent:
      sellInvested > 0 ? (realizedProfit / sellInvested) * 100 : 0,
  };
}

export function statusDisplayDate(status: FundUnitStatus): string {
  return toIsoDateOnly(status.date);
}
