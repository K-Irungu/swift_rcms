import { NextRequest, NextResponse } from "next/server";
import {connectDB} from "@/lib/db";
import Property from "@/lib/models/Property";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  await connectDB();

  const { id, cid } = await params; // ← await params first

  const filter = id.match(/^[a-f\d]{24}$/i)
    ? { _id: id }
    : { slug: id };

  const property = await Property.findOneAndUpdate(
    filter,
    { $pull: { contacts: { _id: cid } } },
    { returnDocument: "after" }
  );

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}