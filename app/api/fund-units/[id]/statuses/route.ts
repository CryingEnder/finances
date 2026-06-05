import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../../../lib/api-response";
import { isValidObjectId } from "../../../../lib/utils";
import { requireApiAuth } from "../../../../lib/api-auth";
import { API_ERROR_CODES } from "../../../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../../../lib/database";
import { captureServerError } from "../../../../lib/capture-error";
import {
  formatZodErrors,
  fundUnitStatusCreateSchema,
} from "../../../../lib/validation";
import {
  serializeFundUnit,
  fundUnitIdentityMatches,
} from "../../../../lib/fund-unit-serialization";
import {
  todayIsoDate,
  nowIsoDateTime,
  resolveFundUnitStatusDateTime,
} from "../../../../lib/dates";

export async function POST(
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
    const { name, type, date, totalValue, profit } = payload;

    if (
      !name ||
      !type ||
      !date ||
      totalValue === undefined ||
      profit === undefined
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitStatusCreateSchema.safeParse({
      name,
      type,
      date,
      totalValue: Number(totalValue),
      profit: Number(profit),
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
    const currentFundUnit = await fundUnitsCollection.findOne({ _id: objectId });
    if (!currentFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    if (!fundUnitIdentityMatches(currentFundUnit, validatedData.name)) {
      return apiError(API_ERROR_CODES.fundUnitMismatch, 400);
    }

    const status = {
      _id: new ObjectId(),
      type: validatedData.type,
      date: resolveFundUnitStatusDateTime(validatedData.date),
      totalValue: validatedData.totalValue,
      profit: validatedData.profit,
      createdAt: nowIsoDateTime(),
    };

    const result = await fundUnitsCollection.updateOne(
      { _id: objectId },
      {
        $push: { statuses: status },
        $set: { date: todayIsoDate() },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    const updatedFundUnit = await fundUnitsCollection.findOne({ _id: objectId });
    if (!updatedFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    return NextResponse.json(serializeFundUnit(updatedFundUnit), {
      status: 201,
    });
  } catch (error) {
    captureServerError(error, { message: "Error creating fund unit status:" });
    return apiError(API_ERROR_CODES.failedCreateFundUnitStatus, 500);
  }
}
