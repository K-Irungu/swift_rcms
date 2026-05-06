import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { User, Role } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/utils/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    const { id } = await params;
    const { managerId } = await req.json();


    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }


    // Only the property owner can assign a manager
    if (property.ownerId.toString() !== authUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow unsetting the manager
    if (managerId === null) {
      property.propertyManager = null;
      await property.save();
      return NextResponse.json({ propertyManager: null });
    }

    // Verify the target user exists and is actually a PROPERTY_MANAGER
    const manager = await User.findOne({
      _id: managerId,
      role: Role.PROPERTY_MANAGER,
      isActive: true,
    }).select("_id fullName email");

    if (!manager) {
      return NextResponse.json(
        { error: "User not found or is not a property manager" },
        { status: 400 },
      );
    }

    property.propertyManager = manager._id;
    await property.save();

    return NextResponse.json({ propertyManager: manager });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign manager" },
      { status: 500 },
    );
  }
}