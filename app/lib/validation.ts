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

export type CompanyInput = z.infer<typeof companySchema>;
export type PortfolioEntryInput = z.infer<typeof portfolioEntrySchema>;
