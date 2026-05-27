import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { getDepositsCollection } from "../../lib/database";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { captureServerError } from "../../lib/capture-error";
import { depositSchema, formatZodErrors } from "../../lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
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
    captureServerError(error, { message: "Error fetching deposits:" });
    return apiError(API_ERROR_CODES.failedFetchDeposits, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const body: unknown = await request.json();
    if (typeof body !== "object" || null === body) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
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
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
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
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const depositsCollection = await getDepositsCollection(user.id);

    const existingDeposit = await depositsCollection.findOne({
      bank: validatedData.bank,
      depositName: validatedData.depositName,
    });
    if (existingDeposit) {
      return apiError(API_ERROR_CODES.depositDuplicate, 409);
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
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating deposit:" });
    return apiError(API_ERROR_CODES.failedCreateDeposit, 500);
  }
}
