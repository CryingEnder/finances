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
import { serializeFundUnit } from "../../../lib/fund-unit-serialization";
import {
  formatZodErrors,
  fundUnitHasChanges,
  fundUnitUpdateSchema,
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
    const { openedDate, bondsPercent, currency } = payload;

    if (bondsPercent === undefined || !currency) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitUpdateSchema.safeParse({
      openedDate,
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
          openedDate: currentFundUnit.openedDate,
          bondsPercent: currentFundUnit.bondsPercent,
          currency: resolveCurrency(currentFundUnit.currency),
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const result = await fundUnitsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          openedDate: validatedData.openedDate,
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

    return NextResponse.json(serializeFundUnit(updatedFundUnit));
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
