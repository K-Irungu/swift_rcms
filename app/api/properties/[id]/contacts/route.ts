import { NextRequest, NextResponse } from "next/server";
import {connectDB} from "@/lib/db";
import Property from "@/lib/models/Property";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params; // ← await params first
  const body = await req.json();
  const { role, name, phone } = body;

  if (!role?.trim() || !name?.trim()) {
    return NextResponse.json(
      { error: "Role and name are required." },
      { status: 400 }
    );
  }

  // Match however your GET route finds the property —
  // slug, propertyId field, or ObjectId fallback
  const filter = id.match(/^[a-f\d]{24}$/i)
    ? { _id: id }
    : { slug: id };

  const property = await Property.findOneAndUpdate(
    filter,
    { $push: { contacts: { role, name, phone: phone ?? "" } } },
    { returnDocument: "after", runValidators: true } // ← fixes the deprecation warning too
  );

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const added = property.contacts[property.contacts.length - 1];
  return NextResponse.json(added, { status: 201 });
}