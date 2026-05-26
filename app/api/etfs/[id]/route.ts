import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { todayIsoDate } from "../../../lib/dates";
import { isValidObjectId } from "../../../lib/utils";
import { getEtfsCollection } from "../../../lib/database";
import {
  etfHasChanges,
  etfSchema,
  formatZodErrors,
} from "../../../lib/validation";

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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validationResult.error),
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;
    const etfsCollection = await getEtfsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid ETF ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);

    const currentEtf = await etfsCollection.findOne({ _id: objectId });
    if (!currentEtf) {
      return NextResponse.json({ error: "ETF not found" }, { status: 404 });
    }

    if (!etfHasChanges(currentEtf, validatedData)) {
      return NextResponse.json(
        { error: "No changes to save" },
        { status: 400 },
      );
    }

    const duplicateSymbol = await etfsCollection.findOne({
      symbol: validatedData.symbol,
      _id: { $ne: objectId },
    });
    if (duplicateSymbol) {
      return NextResponse.json(
        { error: "An ETF with this symbol already exists" },
        { status: 409 },
      );
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
      return NextResponse.json({ error: "ETF not found" }, { status: 404 });
    }

    const updatedEtf = await etfsCollection.findOne({ _id: objectId });
    if (!updatedEtf) {
      return NextResponse.json({ error: "ETF not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedEtf,
      _id: updatedEtf._id.toString(),
    });
  } catch (error) {
    console.error("Error updating ETF:", error);
    return NextResponse.json(
      { error: "Failed to update ETF" },
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
    const etfsCollection = await getEtfsCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid ETF ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);
    const result = await etfsCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return NextResponse.json({ error: "ETF not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ETF:", error);
    return NextResponse.json(
      { error: "Failed to delete ETF" },
      { status: 500 },
    );
  }
}
