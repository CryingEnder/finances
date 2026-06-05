export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Company {
  _id?: string;
  instrument: string; // e.g. DIGI, H2O
  isin: string; // International Securities Identification Number
  issuer: string; // Company name
}

export interface PortfolioEntry {
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
}

export type PortfolioEntryWithCalculations = PortfolioEntry & {
  purchaseValue: number; // quantity * averagePrice
  currentValue: number; // quantity * referencePrice
  profit: number; // currentValue - purchaseValue
  profitPercent: number; // (profit / purchaseValue) * 100
};

export interface PortfolioSummary {
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalProfit: number;
  totalProfitPercent: number;
}

export interface Dividend {
  _id?: string;
  instrument: string;
  isin: string;
  issuer: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface Deposit {
  _id?: string;
  bank: string; // e.g. "BCR", "BRD", "ING"
  depositName: string; // e.g. "6-month standard term deposit"
  termMonths: number; // Fixed term duration in months (e.g. 3, 6, 12)
  principal: number; // Initial amount deposited
  interestRate: number; // Annual interest rate as percentage (e.g., 5.5 for 5.5%)
  startDate: string; // ISO date string when deposit was made
  maturityDate?: string; // ISO date string when it matures
  currentBalance: number; // Current amount including earned interest
  earnedInterest: number; // Total interest earned so far
  isActive: boolean; // Whether it's still active or matured
  autoRenew: boolean; // Whether it auto-renews at maturity
}

export type DepositWithCalculations = Deposit & {
  daysActive: number; // Days since start date
  totalReturn: number; // currentBalance - principal
  totalReturnPercent: number; // (totalReturn / principal) * 100
  daysToMaturity?: number; // Days until maturity (if applicable)
};

export interface DepositSummary {
  totalPrincipal: number;
  totalCurrentBalance: number;
  totalEarnedInterest: number;
  totalReturn: number;
  totalReturnPercent: number;
  activeDeposits: number;
  maturedDeposits: number;
}

export interface Transaction {
  _id?: string;
  transactionDate: string; // ISO date string like "2025-10-30"
  settlementDate: string; // ISO date string like "2025-11-03"
  type: "BUY" | "SELL";
  symbol: string; // e.g. "H2O", "TBM"
  isin: string;
  issuer: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  bcrCommission: number;
  settlementCommission: number;
  otherFees: number;
  externalCosts: number;
  netAmount: number;
  realizedProfit?: number; // Only for SELL transactions
  realizedProfitCCY?: number; // Optional, in original currency
  taxWithheld?: number; // Tax withheld (Impozit >=365 RON + Impozit <365 RON), typically for SELL transactions
  market: string; // Market Identifier Code (MIC), e.g. "XBSE" (Bucharest Stock Exchange)
  currency: "RON";
}

export type TransactionWithCalculations = Transaction & {
  totalFees: number; // bcrCommission + settlementCommission + otherFees + externalCosts + taxWithheld
  feesWithoutTax: number; // bcrCommission + settlementCommission + otherFees + externalCosts (excluding tax)
};

export type Currency = "EUR" | "USD" | "RON";

export type TradeType = "BUY" | "SELL";

export interface EtfTransaction {
  _id?: string;
  type: TradeType;
  volume: number;
  actualPrice: number;
  openingPrice: number;
  createdAt: string; // ISO datetime for ordering; display date only in UI
}

export type EtfTransactionWithCalculations = EtfTransaction & {
  value: number;
  purchaseCost: number;
  profitNet: number;
  profitNetPercent: number;
};

export interface Etf {
  _id?: string;
  symbol: string; // e.g. IS3N.DE — unique per user
  label: string; // e.g. Core MSCI EM IMI
  currency: Currency;
  statuses: EtfTransaction[];
}

export type EtfWithCalculations = Etf & {
  latestTransaction?: EtfTransactionWithCalculations;
};

export interface EtfSummary extends EtfPositionSummary {
  buyInvested: number;
}

export interface EtfPositionSummary {
  buyValue: number;
  totalSellValue: number;
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  realizedProfit: number;
  realizedProfitPercent: number;
}

export interface FundUnitStatus {
  _id?: string;
  type: TradeType;
  date: string; // ISO datetime; calendar day from user, current time added on save for sorting
  totalValue: number;
  profit: number;
  createdAt?: string; // ISO datetime; when the record was saved in the app
}

export type FundUnitStatusWithCalculations = FundUnitStatus & {
  invested: number;
  profitPercent: number;
};

export interface FundUnit {
  _id?: string;
  name: string; // e.g. ERSTE Balanced RON — unique per user
  openedDate?: string; // ISO date YYYY-MM-DD; optional, when opened at the bank
  bondsPercent: number; // bonds allocation percentage (0-100)
  currency: Currency;
  date?: string; // ISO date YYYY-MM-DD; updated when fund unit or statuses change
  statuses: FundUnitStatus[];
}

export interface FundUnitPositionSummary {
  buyValue: number;
  totalSellValue: number;
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  realizedProfit: number;
  realizedProfitPercent: number;
}

export interface FundUnitSummary extends FundUnitPositionSummary {
  buyInvested: number;
}
