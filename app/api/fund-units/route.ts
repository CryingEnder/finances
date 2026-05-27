import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { todayIsoDate } from "../../lib/dates";
import { apiError } from "../../lib/api-response";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../lib/database";
import { captureServerError } from "../../lib/capture-error";
import { fundUnitSchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const user = await requireAuth();
    const fundUnitsCollection = await getFundUnitsCollection(user.id);
    const fundUnits = await fundUnitsCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    const serializedFundUnits = fundUnits.map((fundUnit) => ({
      ...fundUnit,
      _id: fundUnit._id.toString(),
    }));

    return NextResponse.json(serializedFundUnits);
  } catch (error) {
    captureServerError(error, { message: "Error fetching fund units:" });
    return apiError(API_ERROR_CODES.failedFetchFundUnits, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    if (typeof body !== "object" || null === body) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const payload = body as Record<string, unknown>;
    const { name, openedDate, totalValue, profit, bondsPercent, currency } =
      payload;

    if (
      !name ||
      totalValue === undefined ||
      profit === undefined ||
      bondsPercent === undefined ||
      !currency
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitSchema.safeParse({
      name,
      openedDate,
      totalValue: Number(totalValue),
      profit: Number(profit),
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
      currency: validatedData.currency,
    });
    if (existingFundUnit) {
      return apiError(API_ERROR_CODES.fundUnitDuplicateName, 409);
    }

    const fundUnit = {
      name: validatedData.name,
      openedDate: validatedData.openedDate,
      totalValue: validatedData.totalValue,
      profit: validatedData.profit,
      bondsPercent: validatedData.bondsPercent,
      currency: validatedData.currency,
      date: todayIsoDate(),
    };

    const result = await fundUnitsCollection.insertOne(fundUnit);

    return NextResponse.json(
      { ...fundUnit, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating fund unit:" });
    return apiError(API_ERROR_CODES.failedCreateFundUnit, 500);
  }
}
