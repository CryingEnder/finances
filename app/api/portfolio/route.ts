import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getPortfolioCollection } from "../../lib/database";
import { captureServerError } from "../../lib/capture-error";
import { formatZodErrors, portfolioEntrySchema } from "../../lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const portfolioCollection = await getPortfolioCollection(user.id);

    const query = date ? { date } : {};

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
    captureServerError(error, { message: "Error fetching portfolio entries:" });
    return apiError(API_ERROR_CODES.failedFetchPortfolioEntries, 500);
  }
}

export async function POST(request: NextRequest) {
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

    const existingEntry = await portfolioCollection.findOne({
      date: validatedData.date,
      instrument: validatedData.instrument,
    });
    if (existingEntry) {
      return apiError(API_ERROR_CODES.portfolioEntryDuplicate, 409);
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
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating portfolio entry:" });
    return apiError(API_ERROR_CODES.failedCreatePortfolioEntry, 500);
  }
}
