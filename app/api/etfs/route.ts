import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { todayIsoDate } from "../../lib/dates";
import { getEtfsCollection } from "../../lib/database";
import { etfSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const user = await requireAuth();
    const etfsCollection = await getEtfsCollection(user.id);
    const etfs = await etfsCollection.find({}).sort({ label: 1 }).toArray();

    const serializedEtfs = etfs.map((etf) => ({
      ...etf,
      _id: etf._id.toString(),
    }));

    return NextResponse.json(serializedEtfs);
  } catch (error) {
    console.error("Error fetching ETFs:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETFs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const existingEtf = await etfsCollection.findOne({
      symbol: validatedData.symbol,
    });
    if (existingEtf) {
      return NextResponse.json(
        { error: "An ETF with this symbol already exists" },
        { status: 409 },
      );
    }

    const etf = {
      symbol: validatedData.symbol,
      label: validatedData.label,
      volume: validatedData.volume,
      actualPrice: validatedData.actualPrice,
      openingPrice: validatedData.openingPrice,
      currency: validatedData.currency,
      date: todayIsoDate(),
    };

    const result = await etfsCollection.insertOne(etf);

    return NextResponse.json(
      { ...etf, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating ETF:", error);
    return NextResponse.json(
      { error: "Failed to create ETF" },
      { status: 500 },
    );
  }
}
