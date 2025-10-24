import { NextRequest, NextResponse } from "next/server";
import { getPortfolioCollection } from "../../../lib/database";
import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
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

    const portfolioCollection = await getPortfolioCollection();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid portfolio entry ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    const existingEntry = await portfolioCollection.findOne({
      date,
      instrument,
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
          date,
          instrument,
          isin,
          issuer,
          quantity: Number(quantity),
          locked: Number(locked),
          averagePrice: Number(averagePrice),
          referencePrice: Number(referencePrice),
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
    await requireAuth();
    const portfolioCollection = await getPortfolioCollection();
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
