import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getDividendsCollection } from "../../lib/database";
import { captureServerError } from "../../lib/capture-error";
import { dividendSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const dividendsCollection = await getDividendsCollection(user.id);

    const dividends = await dividendsCollection
      .find({})
      .sort({ date: -1, isin: 1 })
      .toArray();

    const serialized = dividends.map((row) => ({
      _id: row._id.toString(),
      instrument: row.instrument,
      isin: row.isin,
      issuer: row.issuer,
      date: row.date,
      amount: row.amount,
      ...(row.notes &&
      "string" === typeof row.notes &&
      row.notes.length > 0
        ? { notes: row.notes }
        : {}),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    captureServerError(error, { message: "Error fetching dividends:" });
    return apiError(API_ERROR_CODES.failedFetchDividends, 500);
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

    const doc = {
      instrument: validated.instrument,
      isin: validated.isin,
      issuer: validated.issuer,
      date: validated.date,
      amount: validated.amount,
      ...(undefined !== validated.notes ? { notes: validated.notes } : {}),
    };

    const result = await dividendsCollection.insertOne(doc);

    return NextResponse.json(
      { ...doc, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating dividend:" });
    return apiError(API_ERROR_CODES.failedCreateDividend, 500);
  }
}
