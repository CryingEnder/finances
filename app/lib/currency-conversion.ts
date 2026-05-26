import type { Currency } from "./types";

export const FALLBACK_EXCHANGE_RATES_TO_RON = {
  USD: 4.5,
  EUR: 5.2,
} as const;

export interface RonExchangeRates {
  USD: number;
  EUR: number;
}

const RATE_FRACTION_DIGITS = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

export function formatExchangeRate(rate: number, numberFormat: string): string {
  return new Intl.NumberFormat(numberFormat, RATE_FRACTION_DIGITS).format(rate);
}

export function convertToRon(
  amount: number,
  currency: Currency,
  rates: RonExchangeRates,
): number {
  if ("USD" === currency) {
    return amount * rates.USD;
  }
  if ("EUR" === currency) {
    return amount * rates.EUR;
  }
  return amount;
}
