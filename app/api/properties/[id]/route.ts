import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import path from "path";
import fs from "fs/promises";


function buildQuery(slug: string) {
  return { slug };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const property = await Property.findOne(buildQuery(id));
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch property",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Whitelist only editable fields
    const allowedUpdate = {
      propertyName: body.propertyName,
      description: body.description,
      location: body.location,
      unitTypes: body.unitTypes,
      billing: body.billing,
      updatedAt: new Date(),
    };

    await connectDB();
    const property = await Property.findOneAndUpdate(
      buildQuery(id),
      { $set: allowedUpdate }, // explicit $set — never pass raw body
      { new: true, runValidators: true },
    );

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update property",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("coverPhoto") as File | null; // matches frontend key

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let coverPhotoUrl = "";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(process.cwd(), "public/uploads", filename);
    await fs.writeFile(filepath, buffer);
    coverPhotoUrl = `/uploads/${filename}`;

    await connectDB();
    const property = await Property.findOneAndUpdate(
      buildQuery(id),
      { $set: { coverPhotoUrl, updatedAt: new Date() } }
    );

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ coverPhotoUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload photo",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const property = await Property.findOneAndDelete(buildQuery(id));
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete property",
      },
      { status: 500 },
    );
  }
}
