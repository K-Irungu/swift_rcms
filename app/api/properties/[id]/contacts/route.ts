import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, name, phone } = body;

    if (!role?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Role and name are required." },
        { status: 400 },
      );
    }

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

    const updated = await Property.findByIdAndUpdate(
      property._id,
      { $push: { contacts: { role: role.trim(), name: name.trim(), phone: phone?.trim() ?? "" } } },
      { returnDocument: "after", runValidators: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const added = updated.contacts[updated.contacts.length - 1];
    return NextResponse.json(added, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add contact" },
      { status: 500 },
    );
  }
}
