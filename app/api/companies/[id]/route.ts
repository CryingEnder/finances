import { NextRequest, NextResponse } from "next/server";
import { getCompaniesCollection } from "../../../lib/database";
import { requireAuth } from "../../../lib/auth";
import { isValidObjectId } from "../../../lib/utils";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();
    const { instrument, isin, issuer } = body;

    if (!instrument || !isin || !issuer) {
      return NextResponse.json(
        { error: "Missing required fields: instrument, isin, issuer" },
        { status: 400 }
      );
    }

    const companiesCollection = await getCompaniesCollection();

    if (!isValidObjectId(params.id)) {
      return NextResponse.json(
        { error: "Invalid company ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(params.id);

    // Check if company with same instrument already exists (excluding current one)
    const existingCompany = await companiesCollection.findOne({
      instrument,
      _id: { $ne: objectId },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this instrument already exists" },
        { status: 409 }
      );
    }

    const result = await companiesCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          instrument,
          isin,
          issuer,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const companiesCollection = await getCompaniesCollection();

    if (!isValidObjectId(params.id)) {
      return NextResponse.json(
        { error: "Invalid company ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(params.id);
    const result = await companiesCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
