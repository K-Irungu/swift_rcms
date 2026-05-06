import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, cid } = await params;
    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const isOwner   = String(property.ownerId) === authUser.userId;
    const isManager = property.propertyManager &&
      String(property.propertyManager) === authUser.userId;

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Property.findByIdAndUpdate(
      property._id,
      { $pull: { contacts: { _id: cid } } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete contact" },
      { status: 500 },
    );
  }
}
