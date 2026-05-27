import { captureWarning, captureServerError } from "./capture-error";
import { FALLBACK_EXCHANGE_RATES_TO_RON } from "./currency-conversion";

const BNR_FX_RATES_URL = "https://www.bnr.ro/nbrfxrates.xml";
const BNR_CACHE_REVALIDATE_SECONDS = 86_400;

export type ExchangeRateSource = "bnr" | "fallback";

export interface ExchangeRatesResult {
  rates: {
    USD: number;
    EUR: number;
  };
  rateDate: string | null;
  source: ExchangeRateSource;
}

const BNR_CUBE_REGEX = /<Cube date="([^"]+)">([\s\S]*?)<\/Cube>/;
const BNR_EUR_RATE_REGEX = /<Rate currency="EUR">([\d.]+)<\/Rate>/;
const BNR_USD_RATE_REGEX = /<Rate currency="USD">([\d.]+)<\/Rate>/;

function parseBnrFxRatesXml(xml: string): {
  USD: number;
  EUR: number;
  rateDate: string;
} | null {
  const cubeMatch = BNR_CUBE_REGEX.exec(xml);
  const rateDate = cubeMatch?.[1];
  const cubeBody = cubeMatch?.[2];
  if (!rateDate || !cubeBody) {
    return null;
  }

  const eurMatch = BNR_EUR_RATE_REGEX.exec(cubeBody);
  const usdMatch = BNR_USD_RATE_REGEX.exec(cubeBody);
  const eurValue = eurMatch?.[1];
  const usdValue = usdMatch?.[1];

  if (!eurValue || !usdValue) {
    return null;
  }

  const EUR = Number(eurValue);
  const USD = Number(usdValue);

  if (!Number.isFinite(EUR) || !Number.isFinite(USD) || EUR <= 0 || USD <= 0) {
    return null;
  }

  return { EUR, USD, rateDate };
}

function fallbackExchangeRates(): ExchangeRatesResult {
  return {
    rates: { ...FALLBACK_EXCHANGE_RATES_TO_RON },
    rateDate: null,
    source: "fallback",
  };
}

export async function getBnrExchangeRates(): Promise<ExchangeRatesResult> {
  try {
    const response = await fetch(BNR_FX_RATES_URL, {
      next: { revalidate: BNR_CACHE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      captureWarning("BNR exchange rates fetch failed", {
        status: response.status,
      });
      return fallbackExchangeRates();
    }

    const parsed = parseBnrFxRatesXml(await response.text());
    if (!parsed) {
      captureWarning("BNR exchange rates XML parse failed");
      return fallbackExchangeRates();
    }

    return {
      rates: { EUR: parsed.EUR, USD: parsed.USD },
      rateDate: parsed.rateDate,
      source: "bnr",
    };
  } catch (error) {
    captureServerError(error, { message: "BNR exchange rates fetch error" });
    return fallbackExchangeRates();
  }
}
