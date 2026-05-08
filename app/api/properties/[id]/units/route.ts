import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Tenant } from "@/lib/models/Tenant";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    await connectDB();

    const property = await Property.findOne({ slug: id }, { _id: 1, ownerId: 1, propertyManager: 1 });
    if (!property) {
      return errorResponse("Property not found", 404);
    }

    const isOwner   = String(property.ownerId) === authUser.userId;
    const isManager = property.propertyManager &&
      String(property.propertyManager) === authUser.userId;

    if (!isOwner && !isManager) {
      return errorResponse("Forbidden", 403);
    }

    const units = await Unit.find({ propertyId: property._id })
      .sort({ unitNumber: 1 })
      .lean();

    // attach current tenant (non-inactive) to each unit
    const tenants = await Tenant.find(
      { propertyId: property._id, unitId: { $ne: null }, onboardingStatus: { $ne: "INACTIVE" } },
      { _id: 1, fullName: 1, unitId: 1 },
    ).lean();

    const tenantByUnit = new Map(tenants.map((t) => [String(t.unitId), t]));

    const result = units.map((u) => ({
      ...u,
      currentTenant: tenantByUnit.get(String(u._id)) ?? null,
    }));

    return successResponse(result, "Units fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch units",
      500,
    );
  }
}
