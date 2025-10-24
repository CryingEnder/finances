import { NextRequest, NextResponse } from "next/server";
import { getCompaniesCollection } from "../../lib/database";
import { requireAuth } from "../../lib/auth";
import { companySchema, formatZodErrors } from "../../lib/validation";
import type { Company } from "../../lib/types";

export async function GET() {
  try {
    const user = await requireAuth();
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
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { instrument, isin, issuer } = body;

    if (!instrument || !isin || !issuer) {
      return NextResponse.json(
        { error: "Missing required fields: instrument, isin, issuer" },
        { status: 400 }
      );
    }

    const validationResult = companySchema.safeParse({
      instrument,
      isin,
      issuer,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validationResult.error),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const companiesCollection = await getCompaniesCollection(user.id);

    const existingCompany = await companiesCollection.findOne({
      instrument: validatedData.instrument,
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this instrument already exists" },
        { status: 409 }
      );
    }

    const company = {
      instrument: validatedData.instrument,
      isin: validatedData.isin,
      issuer: validatedData.issuer,
    };

    const result = await companiesCollection.insertOne(company);

    return NextResponse.json(
      { ...company, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
