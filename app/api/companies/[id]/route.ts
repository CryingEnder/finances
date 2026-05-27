import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { apiError } from "../../../lib/api-response";
import { isValidObjectId } from "../../../lib/utils";
import { API_ERROR_CODES } from "../../../lib/api-error-codes";
import { getCompaniesCollection } from "../../../lib/database";
import { captureServerError } from "../../../lib/capture-error";
import { companySchema, formatZodErrors } from "../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    if (typeof body !== "object" || null === body) {
      return apiError(API_ERROR_CODES.missingCompanyFields, 400);
    }

    const payload = body as Record<string, unknown>;
    const { instrument, isin, issuer } = payload;

    if (!instrument || !isin || !issuer) {
      return apiError(API_ERROR_CODES.missingCompanyFields, 400);
    }

    const validationResult = companySchema.safeParse({
      instrument,
      isin,
      issuer,
    });

    if (!validationResult.success) {
      return apiError(
        API_ERROR_CODES.validationFailed,
        400,
        formatZodErrors(validationResult.error),
      );
    }

    const validatedData = validationResult.data;
    const companiesCollection = await getCompaniesCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidCompanyId, 400);
    }

    const objectId = new ObjectId(id);

    const existingCompany = await companiesCollection.findOne({
      instrument: validatedData.instrument,
      _id: { $ne: objectId },
    });
    if (existingCompany) {
      return apiError(API_ERROR_CODES.companyDuplicateInstrument, 409);
    }

    const result = await companiesCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          instrument: validatedData.instrument,
          isin: validatedData.isin,
          issuer: validatedData.issuer,
        },
      },
    );

    if (0 === result.matchedCount) {
      return apiError(API_ERROR_CODES.companyNotFound, 404);
    }

    const updatedCompany = await companiesCollection.findOne({ _id: objectId });
    if (!updatedCompany) {
      return apiError(API_ERROR_CODES.companyNotFound, 404);
    }

    return NextResponse.json({
      ...updatedCompany,
      _id: updatedCompany._id.toString(),
    });
  } catch (error) {
    captureServerError(error, { message: "Error updating company:" });
    return apiError(API_ERROR_CODES.failedUpdateCompany, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const companiesCollection = await getCompaniesCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return apiError(API_ERROR_CODES.invalidCompanyId, 400);
    }

    const objectId = new ObjectId(id);
    const result = await companiesCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return apiError(API_ERROR_CODES.companyNotFound, 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError(error, { message: "Error deleting company:" });
    return apiError(API_ERROR_CODES.failedDeleteCompany, 500);
  }
}
