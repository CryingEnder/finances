import { z } from "zod";

export const companySchema = z.object({
  instrument: z
    .string()
    .min(1, "Instrument name is required")
    .max(100, "Instrument name must be 100 characters or less")
    .trim(),
  isin: z
    .string()
    .length(12, "ISIN must be exactly 12 characters")
    .regex(
      /^[A-Z0-9]{12}$/,
      "ISIN must be 12 alphanumeric characters (e.g., RO1234567890)"
    )
    .transform((val) => val.toUpperCase()),
  issuer: z
    .string()
    .min(1, "Issuer name is required")
    .max(200, "Issuer name must be 200 characters or less")
    .trim(),
});

export const portfolioEntrySchema = z
  .object({
    date: z
      .string()
      .min(1, "Date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    instrument: z
      .string()
      .min(1, "Instrument name is required")
      .max(100, "Instrument name must be 100 characters or less")
      .trim(),
    isin: z
      .string()
      .length(12, "ISIN must be exactly 12 characters")
      .regex(
        /^[A-Z0-9]{12}$/,
        "ISIN must be 12 alphanumeric characters (e.g., RO1234567890)"
      )
      .transform((val) => val.toUpperCase()),
    issuer: z
      .string()
      .min(1, "Issuer name is required")
      .max(200, "Issuer name must be 200 characters or less")
      .trim(),
    quantity: z
      .number()
      .min(0, "Quantity must be 0 or greater")
      .max(1000000000, "Quantity cannot exceed 1 billion units"),
    locked: z
      .number()
      .min(0, "Locked amount must be 0 or greater")
      .max(1000000000, "Locked amount cannot exceed 1 billion units"),
    averagePrice: z
      .number()
      .min(0.001, "Average price must be at least 0.001 RON")
      .max(1000000, "Average price cannot exceed 1,000,000 RON"),
    referencePrice: z
      .number()
      .min(0.001, "Reference price must be at least 0.001 RON")
      .max(1000000, "Reference price cannot exceed 1,000,000 RON"),
  })
  .refine((data) => data.locked <= data.quantity, {
    message: "Locked amount cannot exceed quantity",
    path: ["locked"],
  });

export function formatZodErrors(error: z.ZodError) {
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

export const depositSchema = z
  .object({
    bank: z
      .string()
      .min(1, "Bank name is required")
      .max(100, "Bank name must be 100 characters or less")
      .trim(),
    depositName: z
      .string()
      .min(1, "Deposit name is required")
      .max(200, "Deposit name must be 200 characters or less")
      .trim(),
    principal: z
      .number()
      .min(0.01, "Principal must be at least 0.01 RON")
      .max(10000000, "Principal cannot exceed 10,000,000 RON"),
    interestRate: z
      .number()
      .min(0, "Interest rate must be 0 or greater")
      .max(100, "Interest rate cannot exceed 100%"),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    maturityDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Maturity date must be in YYYY-MM-DD format"
      )
      .optional()
      .or(z.literal("")),
    currentBalance: z
      .number()
      .min(0, "Current balance must be 0 or greater")
      .max(10000000, "Current balance cannot exceed 10,000,000 RON"),
    earnedInterest: z
      .number()
      .min(0, "Earned interest must be 0 or greater")
      .max(10000000, "Earned interest cannot exceed 10,000,000 RON"),
    isActive: z.boolean(),
    autoRenew: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.maturityDate && data.maturityDate !== "") {
        return new Date(data.maturityDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "Maturity date must be after start date",
      path: ["maturityDate"],
    }
  )
  .refine((data) => data.currentBalance >= data.principal, {
    message: "Current balance should not be less than principal amount",
    path: ["currentBalance"],
  })
  .transform((data) => ({
    ...data,
    maturityDate: data.maturityDate === "" ? undefined : data.maturityDate,
  }));

export const transactionSchema = z
  .object({
    transactionDate: z
      .string()
      .min(1, "Transaction date is required")
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Transaction date must be in YYYY-MM-DD format"
      ),
    settlementDate: z
      .string()
      .min(1, "Settlement date is required")
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Settlement date must be in YYYY-MM-DD format"
      ),
    type: z.enum(["BUY", "SELL"], {
      message: "Type must be either BUY or SELL",
    }),
    symbol: z
      .string()
      .min(1, "Symbol is required")
      .max(50, "Symbol must be 50 characters or less")
      .trim(),
    isin: z
      .string()
      .length(12, "ISIN must be exactly 12 characters")
      .regex(
        /^[A-Z0-9]{12}$/,
        "ISIN must be 12 alphanumeric characters (e.g., RO1234567890)"
      )
      .transform((val) => val.toUpperCase()),
    issuer: z
      .string()
      .min(1, "Issuer name is required")
      .max(200, "Issuer name must be 200 characters or less")
      .trim(),
    quantity: z
      .number()
      .min(0.0001, "Quantity must be greater than 0")
      .max(1000000000, "Quantity cannot exceed 1 billion units"),
    unitPrice: z
      .number()
      .min(0.0001, "Unit price must be greater than 0")
      .max(1000000, "Unit price cannot exceed 1,000,000 RON"),
    grossAmount: z
      .number()
      .min(0, "Gross amount must be 0 or greater")
      .max(100000000, "Gross amount cannot exceed 100,000,000 RON"),
    bcrCommission: z
      .number()
      .min(0, "BCR commission must be 0 or greater")
      .max(1000000, "BCR commission cannot exceed 1,000,000 RON"),
    settlementCommission: z
      .number()
      .min(0, "Settlement commission must be 0 or greater")
      .max(1000000, "Settlement commission cannot exceed 1,000,000 RON"),
    otherFees: z
      .number()
      .min(0, "Other fees must be 0 or greater")
      .max(1000000, "Other fees cannot exceed 1,000,000 RON"),
    externalCosts: z
      .number()
      .min(0, "External costs must be 0 or greater")
      .max(1000000, "External costs cannot exceed 1,000,000 RON"),
    netAmount: z
      .number()
      .max(100000000, "Net amount cannot exceed 100,000,000 RON"),
    realizedProfit: z
      .number()
      .max(100000000, "Realized profit cannot exceed 100,000,000 RON")
      .optional(),
    realizedProfitCCY: z
      .number()
      .max(100000000, "Realized profit CCY cannot exceed 100,000,000")
      .optional(),
    taxWithheld: z
      .number()
      .min(0, "Tax withheld must be 0 or greater")
      .max(1000000, "Tax withheld cannot exceed 1,000,000 RON")
      .optional(),
    market: z
      .string()
      .min(1, "Market Identifier Code (MIC) is required")
      .max(20, "Market Identifier Code must be 20 characters or less")
      .trim(),
  })
  .refine(
    (data) => {
      if (data.type === "SELL") {
        return data.realizedProfit !== undefined;
      }
      return true;
    },
    {
      message: "Realized profit is required for SELL transactions",
      path: ["realizedProfit"],
    }
  );

export type CompanyInput = z.infer<typeof companySchema>;
export type PortfolioEntryInput = z.infer<typeof portfolioEntrySchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
