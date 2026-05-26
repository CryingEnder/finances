import type { Currency } from "./types";

export const CURRENCIES: Currency[] = ["EUR", "USD", "RON"];

export function resolveCurrency(
  value: unknown,
  fallback: Currency = "RON",
): Currency {
  if (
    "string" === typeof value &&
    CURRENCIES.includes(value as Currency)
  ) {
    return value as Currency;
  }
  return fallback;
}
