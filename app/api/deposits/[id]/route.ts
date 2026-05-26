import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { getDepositsCollection } from "../../../lib/database";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { depositSchema, formatZodErrors } from "../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
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
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidDepositId, 400);
    }

    const objectId = new ObjectId(id);

    const existingDeposit = await depositsCollection.findOne({
      bank: validatedData.bank,
      depositName: validatedData.depositName,
      _id: { $ne: objectId },
    });
    if (existingDeposit) {
      return apiError(API_ERROR_CODES.depositDuplicate, 409);
    }

    const result = await depositsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
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
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.depositNotFound, 404);
    }

    const updatedDeposit = await depositsCollection.findOne({ _id: objectId });
    if (!updatedDeposit) {
      return apiError(API_ERROR_CODES.depositNotFound, 404);
    }

    return NextResponse.json({
      ...updatedDeposit,
      _id: updatedDeposit._id.toString(),
    });
  } catch (error) {
    console.error("Error updating deposit:", error);
    return apiError(API_ERROR_CODES.failedUpdateDeposit, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const depositsCollection = await getDepositsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidDepositId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await depositsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.depositNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deposit:", error);
    return apiError(API_ERROR_CODES.failedDeleteDeposit, 500);
  }
}
