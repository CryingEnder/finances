import type { Company } from "./types";

export function findCompanyByIsin(
  companies: Company[],
  isin: string,
): Company | undefined {
  return companies.find((company) => company.isin === isin);
}

export function resolveCompanyFields(
  companies: Company[],
  isin: string,
  fallback: { instrument: string; issuer: string },
): { instrument: string; isin: string; issuer: string } {
  const company = findCompanyByIsin(companies, isin);
  if (company) {
    return {
      instrument: company.instrument,
      isin: company.isin,
      issuer: company.issuer,
    };
  }

  return {
    instrument: fallback.instrument,
    isin,
    issuer: fallback.issuer,
  };
}
