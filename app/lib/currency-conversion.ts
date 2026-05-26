import type { Currency } from "./types";

// TODO: Replace hardcoded rates with live API exchange rates.
export const EXCHANGE_RATES_TO_RON = {
  USD: 4.5,
  EUR: 5.2,
} as const;

const RATE_FRACTION_DIGITS = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

export function formatExchangeRate(rate: number, numberFormat: string): string {
  return new Intl.NumberFormat(numberFormat, RATE_FRACTION_DIGITS).format(rate);
}

export function formatUsdToRonRate(numberFormat: string): string {
  return formatExchangeRate(EXCHANGE_RATES_TO_RON.USD, numberFormat);
}

export function formatEurToRonRate(numberFormat: string): string {
  return formatExchangeRate(EXCHANGE_RATES_TO_RON.EUR, numberFormat);
}

export function convertToRon(amount: number, currency: Currency): number {
  if ("RON" === currency) {
    return amount;
  }
  if ("USD" === currency) {
    // TODO: Use API rate instead of EXCHANGE_RATES_TO_RON.USD.
    return amount * EXCHANGE_RATES_TO_RON.USD;
  }
  // TODO: Use API rate instead of EXCHANGE_RATES_TO_RON.EUR.
  return amount * EXCHANGE_RATES_TO_RON.EUR;
}
