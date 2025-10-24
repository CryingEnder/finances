export type User = {
  id: string;
  email: string;
  name: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type Company = {
  _id?: string;
  instrument: string; // e.g. DIGI, H2O
  isin: string; // International Securities Identification Number
  issuer: string; // Company name
};

export type PortfolioEntry = {
  _id?: string;
  date: string; // ISO date string like "2025-10-24"
  currency: "RON";
  instrument: string; // e.g. DIGI
  isin: string;
  issuer: string;
  quantity: number;
  locked: number;
  averagePrice: number;
  referencePrice: number;
};

// Client-side calculated fields
export type PortfolioEntryWithCalculations = PortfolioEntry & {
  purchaseValue: number; // quantity * averagePrice
  currentValue: number; // quantity * referencePrice
  profit: number; // currentValue - purchaseValue
  profitPercent: number; // (profit / purchaseValue) * 100
};

export type PortfolioSummary = {
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalProfit: number;
  totalProfitPercent: number;
};
