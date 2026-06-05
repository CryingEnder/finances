import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { nowIsoDateTime } from "../../../../lib/dates";
import { apiError } from "../../../../lib/api-response";
import { isValidObjectId } from "../../../../lib/utils";
import { requireApiAuth } from "../../../../lib/api-auth";
import { getEtfsCollection } from "../../../../lib/database";
import { API_ERROR_CODES } from "../../../../lib/api-error-codes";
import { captureServerError } from "../../../../lib/capture-error";
import {
  serializeEtf,
  etfIdentityMatches,
} from "../../../../lib/etf-serialization";
import {
  formatZodErrors,
  etfTransactionCreateSchema,
} from "../../../../lib/validation";

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
    const { symbol, label, type, volume, actualPrice, openingPrice } = payload;

    if (
      !symbol ||
      !label ||
      !type ||
      volume === undefined ||
      actualPrice === undefined ||
      openingPrice === undefined
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = etfTransactionCreateSchema.safeParse({
      symbol,
      label,
      type,
      volume: Number(volume),
      actualPrice: Number(actualPrice),
      openingPrice: Number(openingPrice),
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
      !etfIdentityMatches(
        currentEtf,
        validatedData.symbol,
        validatedData.label,
      )
    ) {
      return apiError(API_ERROR_CODES.etfMismatch, 400);
    }

    const transaction = {
      _id: new ObjectId(),
      type: validatedData.type,
      volume: validatedData.volume,
      actualPrice: validatedData.actualPrice,
      openingPrice: validatedData.openingPrice,
      createdAt: nowIsoDateTime(),
    };

    const result = await etfsCollection.updateOne(
      { _id: objectId },
      { $push: { statuses: transaction } },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    const updatedEtf = await etfsCollection.findOne({ _id: objectId });
    if (!updatedEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    return NextResponse.json(serializeEtf(updatedEtf), { status: 201 });
  } catch (error) {
    captureServerError(error, { message: "Error creating ETF transaction:" });
    return apiError(API_ERROR_CODES.failedCreateEtfTransaction, 500);
  }
}
