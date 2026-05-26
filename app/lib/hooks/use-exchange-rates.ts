import { useQuery } from "@tanstack/react-query";

import type { ExchangeRateSource } from "../bnr-rates";
import type { RonExchangeRates } from "../currency-conversion";

import { API_ERROR_CODES } from "../api-error-codes";

import {
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const exchangeRatesKeys = {
  all: ["exchange-rates"] as const,
};

export interface ExchangeRatesData {
  rates: RonExchangeRates;
  rateDate: string | null;
  source: ExchangeRateSource;
}

const EXCHANGE_RATES_STALE_MS = 60 * 60 * 1000;

const parseExchangeRates = (value: unknown): ExchangeRatesData => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const rates = payload.rates;
  const rateDate = payload.rateDate;
  const source = payload.source;

  if ("object" !== typeof rates || null === rates) {
    throwInvalidPayload();
  }

  const ratesRecord = rates as Record<string, unknown>;
  const usd = ratesRecord.USD;
  const eur = ratesRecord.EUR;

  if (
    "number" !== typeof usd ||
    "number" !== typeof eur ||
    ("string" !== typeof rateDate && null !== rateDate) ||
    ("bnr" !== source && "fallback" !== source)
  ) {
    throwInvalidPayload();
  }

  return {
    rates: { USD: usd, EUR: eur },
    rateDate,
    source,
  };
};

async function fetchExchangeRates(): Promise<ExchangeRatesData> {
  let response: Response;

  try {
    response = await fetch("/api/exchange-rates");
  } catch {
    throwNetworkError();
  }

  await assertOkResponse(response, API_ERROR_CODES.failedFetchExchangeRates);

  const data: unknown = await response.json();
  return parseExchangeRates(data);
}

export function useExchangeRates() {
  return useQuery({
    queryKey: exchangeRatesKeys.all,
    queryFn: fetchExchangeRates,
    staleTime: EXCHANGE_RATES_STALE_MS,
  });
}
