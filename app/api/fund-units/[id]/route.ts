import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { todayIsoDate } from "../../../lib/dates";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { requireApiAuth } from "../../../lib/api-auth";
import { resolveCurrency } from "../../../lib/currency";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../../lib/database";
import { captureServerError } from "../../../lib/capture-error";
import {
  fundUnitSchema,
  formatZodErrors,
  fundUnitHasChanges,
} from "../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { name, openedDate, totalValue, profit, bondsPercent, currency } =
      payload;

    if (
      !name ||
      totalValue === undefined ||
      profit === undefined ||
      bondsPercent === undefined ||
      !currency
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitSchema.safeParse({
      name,
      openedDate,
      totalValue: Number(totalValue),
      profit: Number(profit),
      bondsPercent: Number(bondsPercent),
      currency,
    });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const fundUnitsCollection = await getFundUnitsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidFundUnitId, 400);
    }

    const objectId = new ObjectId(id);

    const currentFundUnit = await fundUnitsCollection.findOne({
      _id: objectId,
    });
    if (!currentFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    if (
      !fundUnitHasChanges(
        {
          ...currentFundUnit,
          currency: resolveCurrency(currentFundUnit.currency),
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const duplicateName = await fundUnitsCollection.findOne({
      name: validatedData.name,
      currency: validatedData.currency,
      _id: { $ne: objectId },
    });
    if (duplicateName) {
      return apiError(API_ERROR_CODES.fundUnitDuplicateName, 409);
    }

    const result = await fundUnitsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          name: validatedData.name,
          openedDate: validatedData.openedDate,
          totalValue: validatedData.totalValue,
          profit: validatedData.profit,
          bondsPercent: validatedData.bondsPercent,
          currency: validatedData.currency,
          date: todayIsoDate(),
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    const updatedFundUnit = await fundUnitsCollection.findOne({
      _id: objectId,
    });
    if (!updatedFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    return NextResponse.json({
      ...updatedFundUnit,
      _id: updatedFundUnit._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error updating fund unit:" });
    return apiError(API_ERROR_CODES.failedUpdateFundUnit, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const fundUnitsCollection = await getFundUnitsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidFundUnitId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await fundUnitsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError(error, { message: "Error deleting fund unit:" });
    return apiError(API_ERROR_CODES.failedDeleteFundUnit, 500);
  }
}
