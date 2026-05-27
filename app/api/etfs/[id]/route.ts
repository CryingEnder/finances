import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { todayIsoDate } from "../../../lib/dates";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { requireApiAuth } from "../../../lib/api-auth";
import { resolveCurrency } from "../../../lib/currency";
import { getEtfsCollection } from "../../../lib/database";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { captureServerError } from "../../../lib/capture-error";
import {
  etfSchema,
  etfHasChanges,
  formatZodErrors,
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
    const { symbol, label, volume, actualPrice, openingPrice, currency } =
      payload;

    if (
      !symbol ||
      !label ||
      volume === undefined ||
      actualPrice === undefined ||
      openingPrice === undefined ||
      !currency
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = etfSchema.safeParse({
      symbol,
      label,
      volume: Number(volume),
      actualPrice: Number(actualPrice),
      openingPrice: Number(openingPrice),
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
    const etfsCollection = await getEtfsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidEtfId, 400);
    }

    const objectId = new ObjectId(id);

    const currentEtf = await etfsCollection.findOne({ _id: objectId });
    if (!currentEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    if (
      !etfHasChanges(
        {
          ...currentEtf,
          currency: resolveCurrency(currentEtf.currency, "EUR"),
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const duplicateSymbol = await etfsCollection.findOne({
      symbol: validatedData.symbol,
      _id: { $ne: objectId },
    });
    if (duplicateSymbol) {
      return apiError(API_ERROR_CODES.etfDuplicateSymbol, 409);
    }

    const result = await etfsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          symbol: validatedData.symbol,
          label: validatedData.label,
          volume: validatedData.volume,
          actualPrice: validatedData.actualPrice,
          openingPrice: validatedData.openingPrice,
          currency: validatedData.currency,
          date: todayIsoDate(),
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    const updatedEtf = await etfsCollection.findOne({ _id: objectId });
    if (!updatedEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    return NextResponse.json({
      ...updatedEtf,
      _id: updatedEtf._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error updating ETF:" });
    return apiError(API_ERROR_CODES.failedUpdateEtf, 500);
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
    const etfsCollection = await getEtfsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidEtfId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await etfsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError(error, { message: "Error deleting ETF:" });
    return apiError(API_ERROR_CODES.failedDeleteEtf, 500);
  }
}
