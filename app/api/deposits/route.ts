import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { getDepositsCollection } from "../../lib/database";
import { depositSchema, formatZodErrors } from "../../lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const depositsCollection = await getDepositsCollection(user.id);

    const query = isActive !== null ? { isActive: "true" === isActive } : {};

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
    const body: unknown = await request.json();
    if (typeof body !== "object" || null === body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const {
      bank,
      depositName,
      termMonths,
      principal,
      interestRate,
      startDate,
      maturityDate,
      currentBalance,
      earnedInterest,
      isActive,
      autoRenew,
    } = payload;

    if (
      !bank ||
      !depositName ||
      termMonths === undefined ||
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
      termMonths: Number(termMonths),
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
      termMonths: validatedData.termMonths,
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
