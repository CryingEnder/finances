import { NextRequest, NextResponse } from "next/server";

import { todayIsoDate } from "../../lib/dates";
import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../lib/database";
import { captureServerError } from "../../lib/capture-error";
import { serializeFundUnit } from "../../lib/fund-unit-serialization";
import { fundUnitSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const fundUnitsCollection = await getFundUnitsCollection(user.id);
    const fundUnits = await fundUnitsCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(fundUnits.map(serializeFundUnit));
  } catch (error) {
    captureServerError(error, { message: "Error fetching fund units:" });
    return apiError(API_ERROR_CODES.failedFetchFundUnits, 500);
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
    const { name, openedDate, bondsPercent, currency } = payload;

    if (!name || bondsPercent === undefined || !currency) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitSchema.safeParse({
      name,
      openedDate,
      bondsPercent: Number(bondsPercent),
      currency,
    });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const fundUnitsCollection = await getFundUnitsCollection(user.id);

    const existingFundUnit = await fundUnitsCollection.findOne({
      name: validatedData.name,
    });
    if (existingFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitDuplicateName, 409);
    }

    const fundUnit = {
      name: validatedData.name,
      openedDate: validatedData.openedDate,
      bondsPercent: validatedData.bondsPercent,
      currency: validatedData.currency,
      date: todayIsoDate(),
      statuses: [],
    };

    const result = await fundUnitsCollection.insertOne(fundUnit);

    return NextResponse.json(
      serializeFundUnit({ ...fundUnit, _id: result.insertedId }),
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating fund unit:" });
    return apiError(API_ERROR_CODES.failedCreateFundUnit, 500);
  }
}
