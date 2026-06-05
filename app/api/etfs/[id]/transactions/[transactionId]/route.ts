import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../../../../lib/api-response";
import { isValidObjectId } from "../../../../../lib/utils";
import { requireApiAuth } from "../../../../../lib/api-auth";
import { getEtfsCollection } from "../../../../../lib/database";
import { serializeEtf } from "../../../../../lib/etf-serialization";
import { API_ERROR_CODES } from "../../../../../lib/api-error-codes";
import { captureServerError } from "../../../../../lib/capture-error";
import {
  formatZodErrors,
  resolveTradeType,
  etfTransactionSchema,
  etfTransactionHasChanges,
} from "../../../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
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
    const { type, volume, actualPrice, openingPrice } = payload;

    if (
      !type ||
      volume === undefined ||
      actualPrice === undefined ||
      openingPrice === undefined
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = etfTransactionSchema.safeParse({
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
    const { id, transactionId } = await params;

    if (!isValidObjectId(id) || !isValidObjectId(transactionId)) {
      return apiError(API_ERROR_CODES.invalidEtfTransactionId, 400);
    }

    const objectId = new ObjectId(id);
    const transactionObjectId = new ObjectId(transactionId);
    const currentEtf = await etfsCollection.findOne({ _id: objectId });
    if (!currentEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    const currentTransaction = (currentEtf.statuses ?? []).find(
      (transaction: { _id?: ObjectId }) =>
        transaction._id?.equals(transactionObjectId),
    );
    if (!currentTransaction) {
      return apiError(API_ERROR_CODES.etfTransactionNotFound, 404);
    }

    if (
      !etfTransactionHasChanges(
        {
          type: resolveTradeType(currentTransaction.type),
          volume: currentTransaction.volume,
          actualPrice: currentTransaction.actualPrice,
          openingPrice: currentTransaction.openingPrice,
        },
        validatedData,
      )
    ) {
      return apiError(API_ERROR_CODES.noChangesToSave, 400);
    }

    const result = await etfsCollection.updateOne(
      {
        _id: objectId,
        "statuses._id": transactionObjectId,
      },
      {
        $set: {
          "statuses.$.type": validatedData.type,
          "statuses.$.volume": validatedData.volume,
          "statuses.$.actualPrice": validatedData.actualPrice,
          "statuses.$.openingPrice": validatedData.openingPrice,
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.etfTransactionNotFound, 404);
    }

    const updatedEtf = await etfsCollection.findOne({ _id: objectId });
    if (!updatedEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    return NextResponse.json(serializeEtf(updatedEtf));
  } catch (error) {
    captureServerError(error, { message: "Error updating ETF transaction:" });
    return apiError(API_ERROR_CODES.failedUpdateEtfTransaction, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const etfsCollection = await getEtfsCollection(user.id);
    const { id, transactionId } = await params;

    if (!isValidObjectId(id) || !isValidObjectId(transactionId)) {
      return apiError(API_ERROR_CODES.invalidEtfTransactionId, 400);
    }

    const objectId = new ObjectId(id);
    const transactionObjectId = new ObjectId(transactionId);

    const result = await etfsCollection.updateOne(
      { _id: objectId },
      { $pull: { statuses: { _id: transactionObjectId } } },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    if (0 === result.modifiedCount) {
      return apiError(API_ERROR_CODES.etfTransactionNotFound, 404);
    }

    const updatedEtf = await etfsCollection.findOne({ _id: objectId });
    if (!updatedEtf) {
      return apiError(API_ERROR_CODES.etfNotFound, 404);
    }

    return NextResponse.json(serializeEtf(updatedEtf));
  } catch (error) {
    captureServerError(error, { message: "Error deleting ETF transaction:" });
    return apiError(API_ERROR_CODES.failedDeleteEtfTransaction, 500);
  }
}
