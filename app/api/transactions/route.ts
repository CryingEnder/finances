import type { Filter } from "mongodb";

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { apiError } from "../../lib/api-response";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { formatZodErrors, transactionSchema } from "../../lib/validation";
import {
  type DatabaseTransaction,
  getTransactionsCollection,
} from "../../lib/database";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const symbol = searchParams.get("symbol");
    const isin = searchParams.get("isin");

    const transactionsCollection = await getTransactionsCollection(user.id);

    const query: Filter<DatabaseTransaction> = {};
    if ("BUY" === type || "SELL" === type) {
      query.type = type;
    }
    if (symbol) {
      query.symbol = symbol;
    }
    if (isin) {
      query.isin = isin;
    }

    const transactions = await transactionsCollection
      .find(query)
      .sort({ settlementDate: -1, symbol: 1 })
      .toArray();

    const serializedTransactions = transactions.map((transaction) => ({
      ...transaction,
      _id: transaction._id.toString(),
    }));

    return NextResponse.json(serializedTransactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return apiError(API_ERROR_CODES.failedFetchTransactions, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    if ("object" !== typeof body || null === body) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = transactionSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;

    const transactionsCollection = await getTransactionsCollection(user.id);

    const transaction = {
      transactionDate: validatedData.transactionDate,
      settlementDate: validatedData.settlementDate,
      type: validatedData.type,
      symbol: validatedData.symbol,
      isin: validatedData.isin,
      issuer: validatedData.issuer,
      quantity: validatedData.quantity,
      unitPrice: validatedData.unitPrice,
      grossAmount: validatedData.grossAmount,
      bcrCommission: validatedData.bcrCommission,
      settlementCommission: validatedData.settlementCommission,
      otherFees: validatedData.otherFees,
      externalCosts: validatedData.externalCosts,
      netAmount: validatedData.netAmount,
      realizedProfit: validatedData.realizedProfit,
      realizedProfitCCY: validatedData.realizedProfitCCY,
      taxWithheld: validatedData.taxWithheld,
      market: validatedData.market,
      currency: "RON" as const,
    };

    const result = await transactionsCollection.insertOne(transaction);

    return NextResponse.json(
      { ...transaction, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating transaction:", error);
    return apiError(API_ERROR_CODES.failedCreateTransaction, 500);
  }
}
