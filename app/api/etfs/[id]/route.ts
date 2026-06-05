import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { requireApiAuth } from "../../../lib/api-auth";
import { resolveCurrency } from "../../../lib/currency";
import { getEtfsCollection } from "../../../lib/database";
import { serializeEtf } from "../../../lib/etf-serialization";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { captureServerError } from "../../../lib/capture-error";
import {
  etfHasChanges,
  etfUpdateSchema,
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
    const { label, currency } = payload;

    if (!label || !currency) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = etfUpdateSchema.safeParse({ label, currency });

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
          label: currentEtf.label,
          currency: resolveCurrency(currentEtf.currency, "EUR"),
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const result = await etfsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          label: validatedData.label,
          currency: validatedData.currency,
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

    return NextResponse.json(serializeEtf(updatedEtf));
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
