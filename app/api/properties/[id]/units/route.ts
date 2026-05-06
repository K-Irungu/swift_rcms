import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Unit } from "@/lib/models/Unit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const units = await Unit.find({ propertyId: id }).sort({ unitNumber: 1 });
    return NextResponse.json(units);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch units" },
      { status: 500 }
    );
  }
}
