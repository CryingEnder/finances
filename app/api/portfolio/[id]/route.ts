import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { getPortfolioCollection } from "../../../lib/database";
import { captureServerError } from "../../../lib/capture-error";
import { formatZodErrors, portfolioEntrySchema } from "../../../lib/validation";

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
      date,
      instrument,
      isin,
      issuer,
      quantity,
      locked,
      averagePrice,
      referencePrice,
    } = payload;

    if (
      !date ||
      !instrument ||
      !isin ||
      !issuer ||
      quantity === undefined ||
      locked === undefined ||
      averagePrice === undefined ||
      referencePrice === undefined
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = portfolioEntrySchema.safeParse({
      date,
      instrument,
      isin,
      issuer,
      quantity: Number(quantity),
      locked: Number(locked),
      averagePrice: Number(averagePrice),
      referencePrice: Number(referencePrice),
    });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const portfolioCollection = await getPortfolioCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidPortfolioEntryId, 400);
    }

    const objectId = new ObjectId(id);

    const existingEntry = await portfolioCollection.findOne({
      date: validatedData.date,
      instrument: validatedData.instrument,
      _id: { $ne: objectId },
    });
    if (existingEntry) {
      return apiError(API_ERROR_CODES.portfolioEntryDuplicate, 409);
    }

    const result = await portfolioCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          date: validatedData.date,
          instrument: validatedData.instrument,
          isin: validatedData.isin,
          issuer: validatedData.issuer,
          quantity: validatedData.quantity,
          locked: validatedData.locked,
          averagePrice: validatedData.averagePrice,
          referencePrice: validatedData.referencePrice,
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.portfolioEntryNotFound, 404);
    }

    const updatedEntry = await portfolioCollection.findOne({ _id: objectId });
    if (!updatedEntry) {
      return apiError(API_ERROR_CODES.portfolioEntryNotFound, 404);
    }

    return NextResponse.json({
      ...updatedEntry,
      _id: updatedEntry._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error updating portfolio entry:" });
    return apiError(API_ERROR_CODES.failedUpdatePortfolioEntry, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const portfolioCollection = await getPortfolioCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidPortfolioEntryId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await portfolioCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.portfolioEntryNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError(error, { message: "Error deleting portfolio entry:" });
    return apiError(API_ERROR_CODES.failedDeletePortfolioEntry, 500);
  }
}
