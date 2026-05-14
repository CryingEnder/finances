import { ObjectId, type UpdateFilter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const { year, amount, instrument, isin, issuer, notes: notesRaw } = payload;

    if (
      year === undefined ||
      amount === undefined ||
      !instrument ||
      !isin ||
      !issuer
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
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
      year: Number(year),
      amount: Number(amount),
      notes,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validationResult.error),
        },
        { status: 400 },
      );
    }

    const validated = validationResult.data;
    const dividendsCollection = await getDividendsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid dividend ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);

    const $set: Partial<DatabaseDividend> = {
      instrument: validated.instrument,
      isin: validated.isin,
      issuer: validated.issuer,
      year: validated.year,
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
      return NextResponse.json(
        { error: "Dividend not found" },
        { status: 404 },
      );
    }

    const updated = await dividendsCollection.findOne({ _id: objectId });
    if (!updated) {
      return NextResponse.json(
        { error: "Dividend not found" },
        { status: 404 },
      );
    }

    const serialized = {
      _id: updated._id.toString(),
      instrument: updated.instrument,
      isin: updated.isin,
      issuer: updated.issuer,
      year: updated.year,
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
    return NextResponse.json(
      { error: "Failed to update dividend" },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: "Invalid dividend ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);
    const result = await dividendsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return NextResponse.json(
        { error: "Dividend not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dividend:", error);
    return NextResponse.json(
      { error: "Failed to delete dividend" },
      { status: 500 },
    );
  }
}
