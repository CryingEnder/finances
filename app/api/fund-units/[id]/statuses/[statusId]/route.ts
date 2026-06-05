import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../../../../lib/api-response";
import { isValidObjectId } from "../../../../../lib/utils";
import { requireApiAuth } from "../../../../../lib/api-auth";
import { API_ERROR_CODES } from "../../../../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../../../../lib/database";
import { captureServerError } from "../../../../../lib/capture-error";
import { serializeFundUnit } from "../../../../../lib/fund-unit-serialization";
import {
  todayIsoDate,
  resolveFundUnitStatusDateTime,
} from "../../../../../lib/dates";
import {
  formatZodErrors,
  resolveTradeType,
  fundUnitStatusSchema,
  fundUnitStatusHasChanges,
} from "../../../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; statusId: string }> },
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
    const { type, date, totalValue, profit } = payload;

    if (!type || !date || totalValue === undefined || profit === undefined) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitStatusSchema.safeParse({
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
    const { id, statusId } = await params;

    if (!isValidObjectId(id) || !isValidObjectId(statusId)) {
      return apiError(API_ERROR_CODES.invalidFundUnitStatusId, 400);
    }

    const objectId = new ObjectId(id);
    const statusObjectId = new ObjectId(statusId);
    const currentFundUnit = await fundUnitsCollection.findOne({ _id: objectId });
    if (!currentFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    const currentStatus = (currentFundUnit.statuses ?? []).find(
      (status: { _id?: ObjectId }) => status._id?.equals(statusObjectId),
    );
    if (!currentStatus) {
      return apiError(API_ERROR_CODES.fundUnitStatusNotFound, 404);
    }

    if (
      !fundUnitStatusHasChanges(
        {
          type: resolveTradeType(currentStatus.type),
          date: currentStatus.date,
          totalValue: currentStatus.totalValue,
          profit: currentStatus.profit,
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const resolvedDate = resolveFundUnitStatusDateTime(
      validatedData.date,
      currentStatus.date,
    );

    const result = await fundUnitsCollection.updateOne(
      {
        _id: objectId,
        "statuses._id": statusObjectId,
      },
      {
        $set: {
          "statuses.$.type": validatedData.type,
          "statuses.$.date": resolvedDate,
          "statuses.$.totalValue": validatedData.totalValue,
          "statuses.$.profit": validatedData.profit,
          date: todayIsoDate(),
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.fundUnitStatusNotFound, 404);
    }

    const updatedFundUnit = await fundUnitsCollection.findOne({ _id: objectId });
    if (!updatedFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    return NextResponse.json(serializeFundUnit(updatedFundUnit));
  } catch (error) {
    captureServerError(error, { message: "Error updating fund unit status:" });
    return apiError(API_ERROR_CODES.failedUpdateFundUnitStatus, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; statusId: string }> },
) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const fundUnitsCollection = await getFundUnitsCollection(user.id);
    const { id, statusId } = await params;

    if (!isValidObjectId(id) || !isValidObjectId(statusId)) {
      return apiError(API_ERROR_CODES.invalidFundUnitStatusId, 400);
    }

    const objectId = new ObjectId(id);
    const statusObjectId = new ObjectId(statusId);

    const result = await fundUnitsCollection.updateOne(
      { _id: objectId },
      {
        $pull: { statuses: { _id: statusObjectId } },
        $set: { date: todayIsoDate() },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    if (0 === result.modifiedCount) {
      return apiError(API_ERROR_CODES.fundUnitStatusNotFound, 404);
    }

    const updatedFundUnit = await fundUnitsCollection.findOne({ _id: objectId });
    if (!updatedFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitNotFound, 404);
    }

    return NextResponse.json(serializeFundUnit(updatedFundUnit));
  } catch (error) {
    captureServerError(error, { message: "Error deleting fund unit status:" });
    return apiError(API_ERROR_CODES.failedDeleteFundUnitStatus, 500);
  }
}
