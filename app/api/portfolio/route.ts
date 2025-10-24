import { NextRequest, NextResponse } from "next/server";
import { getPortfolioCollection } from "../../lib/database";
import { requireAuth } from "../../lib/auth";
import { portfolioEntrySchema, formatZodErrors } from "../../lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const portfolioCollection = await getPortfolioCollection(user.id);

    let query = {};
    if (date) {
      query = { date };
    }

    const entries = await portfolioCollection
      .find(query)
      .sort({ date: -1, instrument: 1 })
      .toArray();

    const serializedEntries = entries.map((entry) => ({
      ...entry,
      _id: entry._id.toString(),
    }));

    return NextResponse.json(serializedEntries);
  } catch (error) {
    console.error("Error fetching portfolio entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const existingEntry = await portfolioCollection.findOne({
      date: validatedData.date,
      instrument: validatedData.instrument,
    });
    if (existingEntry) {
      return NextResponse.json(
        {
          error: "Portfolio entry with this date and instrument already exists",
        },
        { status: 409 }
      );
    }

    const entry = {
      date: validatedData.date,
      currency: "RON" as const,
      instrument: validatedData.instrument,
      isin: validatedData.isin,
      issuer: validatedData.issuer,
      quantity: validatedData.quantity,
      locked: validatedData.locked,
      averagePrice: validatedData.averagePrice,
      referencePrice: validatedData.referencePrice,
    };

    const result = await portfolioCollection.insertOne(entry);

    return NextResponse.json(
      { ...entry, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating portfolio entry:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio entry" },
      { status: 500 }
    );
  }
}
