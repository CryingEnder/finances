import type { Currency } from "./types";

const FRACTION_DIGITS = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

function formatAmountNumber(amount: number, numberFormat: string): string {
  return new Intl.NumberFormat(numberFormat, FRACTION_DIGITS).format(
    Math.abs(amount),
  );
}

export function formatCurrencyDisplay(
  amount: number,
  currency: Currency,
  numberFormat: string,
): string {
  return `${formatAmountNumber(amount, numberFormat)} ${currency}`;
}

export function formatSignedCurrencyAmount(
  amount: number,
  currency: Currency,
  numberFormat: string,
): string {
  if (0 === amount) {
    return formatCurrencyDisplay(0, currency, numberFormat);
  }

  const sign = amount > 0 ? "+" : "-";
  return `${sign} ${formatCurrencyDisplay(amount, currency, numberFormat)}`;
}

export function profitReturnPercent(profit: number, basis: number): number {
  return basis > 0 ? (profit / basis) * 100 : 0;
}
