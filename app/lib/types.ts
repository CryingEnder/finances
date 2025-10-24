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

export type Deposit = {
  _id?: string;
  bank: string; // e.g. "BCR", "BRD", "ING"
  depositName: string; // e.g. "6-month term deposit", "Savings account"
  principal: number; // Initial amount deposited
  interestRate: number; // Annual interest rate as percentage (e.g., 5.5 for 5.5%)
  startDate: string; // ISO date string when deposit was made
  maturityDate?: string; // ISO date string when it matures (optional for term deposits)
  currentBalance: number; // Current amount including earned interest
  earnedInterest: number; // Total interest earned so far
  isActive: boolean; // Whether it's still active or matured
  autoRenew: boolean; // Whether it auto-renews at maturity
};

// Client-side calculated fields for deposits
export type DepositWithCalculations = Deposit & {
  daysActive: number; // Days since start date
  totalReturn: number; // currentBalance - principal
  totalReturnPercent: number; // (totalReturn / principal) * 100
  daysToMaturity?: number; // Days until maturity (if applicable)
};

export type DepositSummary = {
  totalPrincipal: number;
  totalCurrentBalance: number;
  totalEarnedInterest: number;
  totalReturn: number;
  totalReturnPercent: number;
  activeDeposits: number;
  maturedDeposits: number;
};
