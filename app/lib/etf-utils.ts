import type { Etf, EtfTransaction, EtfPositionSummary } from "./types";

export function sortEtfTransactionsByNewest(
  transactions: EtfTransaction[],
): EtfTransaction[] {
  return [...transactions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getLatestEtfTransaction(
  etf: Etf,
): EtfTransaction | undefined {
  if (0 === etf.statuses.length) {
    return undefined;
  }
  return sortEtfTransactionsByNewest(etf.statuses)[0];
}

export function getLatestBuyTransaction(
  etf: Etf,
): EtfTransaction | undefined {
  const buys = etf.statuses.filter((transaction) => "BUY" === transaction.type);
  if (0 === buys.length) {
    return undefined;
  }
  return sortEtfTransactionsByNewest(buys)[0];
}

export function calculateEtfTransactionMetrics(transaction: EtfTransaction) {
  const purchaseCost = transaction.volume * transaction.openingPrice;
  const value = transaction.volume * transaction.actualPrice;
  const profitNet = value - purchaseCost;
  const profitNetPercent =
    purchaseCost > 0 ? (profitNet / purchaseCost) * 100 : 0;

  return { value, purchaseCost, profitNet, profitNetPercent };
}

export function summarizeEtfPosition(etf: Etf): EtfPositionSummary {
  const latestBuy = getLatestBuyTransaction(etf);
  const latestBuyMetrics = latestBuy
    ? calculateEtfTransactionMetrics(latestBuy)
    : undefined;

  let totalSellValue = 0;
  let realizedProfit = 0;
  let sellPurchaseCost = 0;

  for (const transaction of etf.statuses) {
    if ("SELL" !== transaction.type) {
      continue;
    }

    const metrics = calculateEtfTransactionMetrics(transaction);
    totalSellValue += metrics.value;
    realizedProfit += metrics.profitNet;
    sellPurchaseCost += metrics.purchaseCost;
  }

  return {
    buyValue: latestBuyMetrics?.value ?? 0,
    totalSellValue,
    unrealizedProfit: latestBuyMetrics?.profitNet ?? 0,
    unrealizedProfitPercent: latestBuyMetrics?.profitNetPercent ?? 0,
    realizedProfit,
    realizedProfitPercent:
      sellPurchaseCost > 0 ? (realizedProfit / sellPurchaseCost) * 100 : 0,
  };
}

export function transactionDisplayDate(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}
