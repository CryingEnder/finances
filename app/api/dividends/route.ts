import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { getDividendsCollection } from "../../lib/database";
import { dividendSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const user = await requireAuth();
    const dividendsCollection = await getDividendsCollection(user.id);

    const dividends = await dividendsCollection
      .find({})
      .sort({ year: -1, isin: 1 })
      .toArray();

    const serialized = dividends.map((row) => ({
      ...row,
      _id: row._id.toString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching dividends:", error);
    return NextResponse.json(
      { error: "Failed to fetch dividends" },
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

    const doc = {
      instrument: validated.instrument,
      isin: validated.isin,
      issuer: validated.issuer,
      year: validated.year,
      amount: validated.amount,
      ...(undefined !== validated.notes ? { notes: validated.notes } : {}),
    };

    const result = await dividendsCollection.insertOne(doc);

    return NextResponse.json(
      { ...doc, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating dividend:", error);
    return NextResponse.json(
      { error: "Failed to create dividend" },
      { status: 500 },
    );
  }
}
