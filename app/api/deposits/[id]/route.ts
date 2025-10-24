import { NextRequest, NextResponse } from "next/server";
import { getDepositsCollection } from "../../../lib/database";
import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
import { depositSchema, formatZodErrors } from "../../../lib/validation";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      bank,
      depositName,
      principal,
      interestRate,
      startDate,
      maturityDate,
      currentBalance,
      earnedInterest,
      isActive,
      autoRenew,
    } = body;

    if (
      !bank ||
      !depositName ||
      principal === undefined ||
      interestRate === undefined ||
      !startDate ||
      currentBalance === undefined ||
      earnedInterest === undefined ||
      isActive === undefined ||
      autoRenew === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validationResult = depositSchema.safeParse({
      bank,
      depositName,
      principal: Number(principal),
      interestRate: Number(interestRate),
      startDate,
      maturityDate: maturityDate || "",
      currentBalance: Number(currentBalance),
      earnedInterest: Number(earnedInterest),
      isActive: Boolean(isActive),
      autoRenew: Boolean(autoRenew),
    });

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
    const depositsCollection = await getDepositsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid deposit ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    const existingDeposit = await depositsCollection.findOne({
      bank: validatedData.bank,
      depositName: validatedData.depositName,
      _id: { $ne: objectId },
    });
    if (existingDeposit) {
      return NextResponse.json(
        { error: "Deposit with this bank and name already exists" },
        { status: 409 }
      );
    }

    const result = await depositsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          bank: validatedData.bank,
          depositName: validatedData.depositName,
          principal: validatedData.principal,
          interestRate: validatedData.interestRate,
          startDate: validatedData.startDate,
          maturityDate: validatedData.maturityDate,
          currentBalance: validatedData.currentBalance,
          earnedInterest: validatedData.earnedInterest,
          isActive: validatedData.isActive,
          autoRenew: validatedData.autoRenew,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating deposit:", error);
    return NextResponse.json(
      { error: "Failed to update deposit" },
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
    const depositsCollection = await getDepositsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid deposit ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const result = await depositsCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deposit:", error);
    return NextResponse.json(
      { error: "Failed to delete deposit" },
      { status: 500 }
    );
  }
}
