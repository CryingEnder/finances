import { NextRequest, NextResponse } from "next/server";
import { getPortfolioCollection } from "../../../lib/database";
import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
import { portfolioEntrySchema, formatZodErrors } from "../../../lib/validation";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      date,
      instrument,
      isin,
      issuer,
      quantity,
      locked,
      averagePrice,
      referencePrice,
    } = body;

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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validationResult.error),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const portfolioCollection = await getPortfolioCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid portfolio entry ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    const existingEntry = await portfolioCollection.findOne({
      date: validatedData.date,
      instrument: validatedData.instrument,
      _id: { $ne: objectId },
    });
    if (existingEntry) {
      return NextResponse.json(
        {
          error: "Portfolio entry with this date and instrument already exists",
        },
        { status: 409 }
      );
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
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Portfolio entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating portfolio entry:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const portfolioCollection = await getPortfolioCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid portfolio entry ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const result = await portfolioCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Portfolio entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting portfolio entry:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio entry" },
      { status: 500 }
    );
  }
}
