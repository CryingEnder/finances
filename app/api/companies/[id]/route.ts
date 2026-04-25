import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
import { getCompaniesCollection } from "../../../lib/database";
import { companySchema, formatZodErrors } from "../../../lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    if (typeof body !== "object" || null === body) {
      return NextResponse.json(
        { error: "Missing required fields: instrument, isin, issuer" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const { instrument, isin, issuer } = payload;

    if (!instrument || !isin || !issuer) {
      return NextResponse.json(
        { error: "Missing required fields: instrument, isin, issuer" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;
    const companiesCollection = await getCompaniesCollection(user.id);
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid company ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);

    const existingCompany = await companiesCollection.findOne({
      instrument: validatedData.instrument,
      _id: { $ne: objectId },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this instrument already exists" },
        { status: 409 },
      );
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
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updatedCompany = await companiesCollection.findOne({ _id: objectId });
    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedCompany,
      _id: updatedCompany._id.toString(),
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: "Invalid company ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(id);
    const result = await companiesCollection.deleteOne({ _id: objectId });

    if (0 === result.deletedCount) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 },
    );
  }
}
