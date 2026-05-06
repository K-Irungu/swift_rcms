import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { getCurrentUser } from "@/lib/utils/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const property = await Property.findOne({ slug: id }, { _id: 1, ownerId: 1, propertyManager: 1 });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const isOwner   = String(property.ownerId) === authUser.userId;
    const isManager = property.propertyManager &&
      String(property.propertyManager) === authUser.userId;

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const units = await Unit.find({ propertyId: property._id }).sort({ unitNumber: 1 });
    return NextResponse.json(units);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch units" },
      { status: 500 },
    );
  }
}
