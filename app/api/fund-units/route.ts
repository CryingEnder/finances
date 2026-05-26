import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../lib/auth";
import { todayIsoDate } from "../../lib/dates";
import { apiError } from "../../lib/api-response";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getFundUnitsCollection } from "../../lib/database";
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
    console.error("Error fetching fund units:", error);
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
    const { name, openedDate, totalValue, profit, bondsPercent } = payload;
    const resolvedBondsPercent = bondsPercent ?? payload.obligatiuniPercent;

    if (
      !name ||
      totalValue === undefined ||
      profit === undefined ||
      resolvedBondsPercent === undefined
    ) {
      return apiError(API_ERROR_CODES.missingRequiredFields, 400);
    }

    const validationResult = fundUnitSchema.safeParse({
      name,
      openedDate,
      totalValue: Number(totalValue),
      profit: Number(profit),
      bondsPercent: Number(resolvedBondsPercent),
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
      totalValue: validatedData.totalValue,
      profit: validatedData.profit,
      bondsPercent: validatedData.bondsPercent,
      date: todayIsoDate(),
    };

    const result = await fundUnitsCollection.insertOne(fundUnit);

    return NextResponse.json(
      { ...fundUnit, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating fund unit:", error);
    return apiError(API_ERROR_CODES.failedCreateFundUnit, 500);
  }
}
