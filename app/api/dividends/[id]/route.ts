import { ObjectId, type UpdateFilter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { dividendSchema, formatZodErrors } from "../../../lib/validation";
import {
  type DatabaseDividend,
  getDividendsCollection,
} from "../../../lib/database";

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
    const { date, amount, instrument, isin, issuer, notes: notesRaw } = payload;

    if (
      date === undefined ||
      amount === undefined ||
      !instrument ||
      !isin ||
      !issuer
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const notes =
      null === notesRaw || notesRaw === undefined
        ? undefined
        : "string" === typeof notesRaw
          ? notesRaw
          : undefined;

    const validationResult = dividendSchema.safeParse({
      instrument,
      isin,
      issuer,
      date: "string" === typeof date ? date : "",
      amount: Number(amount),
      notes,
    });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validated = validationResult.data;
    const dividendsCollection = await getDividendsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidDividendId, 400);
    }

    const objectId = new ObjectId(id);

    const $set: Partial<DatabaseDividend> = {
      instrument: validated.instrument,
      isin: validated.isin,
      issuer: validated.issuer,
      date: validated.date,
      amount: validated.amount,
    };
    if (undefined !== validated.notes && validated.notes.length > 0) {
      $set.notes = validated.notes;
    }

    const updatePayload: UpdateFilter<DatabaseDividend> = { $set };
    if (undefined === validated.notes || 0 === validated.notes.length) {
      updatePayload.$unset = { notes: true };
    }

    const result = await dividendsCollection.updateOne(
      { _id: objectId },
      updatePayload,
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.dividendNotFound, 404);
    }

    const updated = await dividendsCollection.findOne({ _id: objectId });
    if (!updated) {
      return apiError(API_ERROR_CODES.dividendNotFound, 404);
    }

    const serialized = {
      _id: updated._id.toString(),
      instrument: updated.instrument,
      isin: updated.isin,
      issuer: updated.issuer,
      date: updated.date,
      amount: updated.amount,
      ...(updated.notes &&
      "string" === typeof updated.notes &&
      updated.notes.length > 0
        ? { notes: updated.notes }
        : {}),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error updating dividend:", error);
    return apiError(API_ERROR_CODES.failedUpdateDividend, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const dividendsCollection = await getDividendsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidDividendId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await dividendsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.dividendNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dividend:", error);
    return apiError(API_ERROR_CODES.failedDeleteDividend, 500);
  }
}
