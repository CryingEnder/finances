import { NextRequest, NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { getCompaniesCollection } from "../../lib/database";
import { captureServerError } from "../../lib/capture-error";
import { companySchema, formatZodErrors } from "../../lib/validation";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const user = auth.user;
    const companiesCollection = await getCompaniesCollection(user.id);
    const companies = await companiesCollection
      .find({})
      .sort({ instrument: 1 })
      .toArray();

    const serializedCompanies = companies.map((company) => ({
      ...company,
      _id: company._id.toString(),
    }));

    return NextResponse.json(serializedCompanies);
  } catch (error) {
    captureServerError(error, { message: "Error fetching companies:" });
    return apiError(API_ERROR_CODES.failedFetchCompanies, 500);
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

    const existingCompany = await companiesCollection.findOne({
      instrument: validatedData.instrument,
    });
    if (existingCompany) {
      return apiError(API_ERROR_CODES.companyDuplicateInstrument, 409);
    }

    const company = {
      instrument: validatedData.instrument,
      isin: validatedData.isin,
      issuer: validatedData.issuer,
    };

    const result = await companiesCollection.insertOne(company);

    return NextResponse.json(
      { ...company, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    captureServerError(error, { message: "Error creating company:" });
    return apiError(API_ERROR_CODES.failedCreateCompany, 500);
  }
}
