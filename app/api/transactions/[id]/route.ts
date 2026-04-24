import { NextRequest, NextResponse } from "next/server";
import { getTransactionsCollection } from "../../../lib/database";
import { requireAuth } from "../../../lib/auth";
import { transactionSchema, formatZodErrors } from "../../../lib/validation";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "../../../lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const transactionsCollection = await getTransactionsCollection(user.id);
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...transaction,
      _id: transaction._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const validationResult = transactionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validationResult.error),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const transactionsCollection = await getTransactionsCollection(user.id);

    const existingTransaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
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
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const updatedTransaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      ...updatedTransaction,
      _id: updatedTransaction!._id.toString(),
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const transactionsCollection = await getTransactionsCollection(user.id);

    const result = await transactionsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
