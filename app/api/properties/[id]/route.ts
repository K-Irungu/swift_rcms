import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const property = await Property.findByIdAndUpdate(id, await req.json(), { new: true });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const property = await Property.findByIdAndDelete(id);
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete property" },
      { status: 500 }
    );
  }
}
