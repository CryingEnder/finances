import { NextRequest, NextResponse } from "next/server";
import { getDepositsCollection } from "../../lib/database";
import { requireAuth } from "../../lib/auth";
import { depositSchema, formatZodErrors } from "../../lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const depositsCollection = await getDepositsCollection(user.id);

    let query = {};
    if (isActive !== null) {
      query = { isActive: isActive === "true" };
    }

    const deposits = await depositsCollection
      .find(query)
      .sort({ startDate: -1, bank: 1, depositName: 1 })
      .toArray();

    const serializedDeposits = deposits.map((deposit) => ({
      ...deposit,
      _id: deposit._id.toString(),
    }));

    return NextResponse.json(serializedDeposits);
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const existingDeposit = await depositsCollection.findOne({
      bank: validatedData.bank,
      depositName: validatedData.depositName,
    });
    if (existingDeposit) {
      return NextResponse.json(
        { error: "Deposit with this bank and name already exists" },
        { status: 409 }
      );
    }

    const deposit = {
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
    };

    const result = await depositsCollection.insertOne(deposit);

    return NextResponse.json(
      { ...deposit, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating deposit:", error);
    return NextResponse.json(
      { error: "Failed to create deposit" },
      { status: 500 }
    );
  }
}
