import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { getEtfsCollection } from "../../lib/database";
import { serializeEtf } from "../../lib/etf-serialization";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { captureServerError } from "../../lib/capture-error";
import { etfSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const etfsCollection = await getEtfsCollection(user.id);
    const etfs = await etfsCollection.find({}).sort({ label: 1 }).toArray();

    return NextResponse.json(etfs.map(serializeEtf));
  } catch (error) {
    captureServerError(error, { message: "Error fetching ETFs:" });
    return apiError(API_ERROR_CODES.failedFetchEtfs, 500);
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
    const { symbol, label, currency } = payload;

    if (!symbol || !label || !currency) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = etfSchema.safeParse({ symbol, label, currency });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const etfsCollection = await getEtfsCollection(user.id);

    const existingEtf = await etfsCollection.findOne({
      symbol: validatedData.symbol,
    });
    if (existingEtf) {
      return apiError(API_ERROR_CODES.etfDuplicateSymbol, 409);
    }

    const etf = {
      symbol: validatedData.symbol,
      label: validatedData.label,
      currency: validatedData.currency,
      statuses: [],
    };

    const result = await etfsCollection.insertOne(etf);

    return NextResponse.json(serializeEtf({ ...etf, _id: result.insertedId }), {
      status: 201,
    });
  } catch (error) {
    captureServerError(error, { message: "Error creating ETF:" });
    return apiError(API_ERROR_CODES.failedCreateEtf, 500);
  }
}
