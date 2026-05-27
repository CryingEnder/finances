import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { captureServerError } from "../../../lib/capture-error";
import { getTransactionsCollection } from "../../../lib/database";
import { formatZodErrors, transactionSchema } from "../../../lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidTransactionId, 400);
    }

    const transactionsCollection = await getTransactionsCollection(user.id);
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!transaction) {
      return apiError(API_ERROR_CODES.transactionNotFound, 404);
    }

    return NextResponse.json({
      ...transaction,
      _id: transaction._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error fetching transaction:" });
    return apiError(API_ERROR_CODES.failedFetchTransaction, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body: unknown = await request.json();

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidTransactionId, 400);
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

    const existingTransaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingTransaction) {
      return apiError(API_ERROR_CODES.transactionNotFound, 404);
    }

    const updateData = {
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
    };

    const result = await transactionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.transactionNotFound, 404);
    }

    const updatedTransaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!updatedTransaction) {
      return apiError(API_ERROR_CODES.transactionNotFound, 404);
    }

    return NextResponse.json({
      ...updatedTransaction,
      _id: updatedTransaction._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error updating transaction:" });
    return apiError(API_ERROR_CODES.failedUpdateTransaction, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidTransactionId, 400);
    }

    const transactionsCollection = await getTransactionsCollection(user.id);

    const result = await transactionsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.transactionNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError(error, { message: "Error deleting transaction:" });
    return apiError(API_ERROR_CODES.failedDeleteTransaction, 500);
  }
}
