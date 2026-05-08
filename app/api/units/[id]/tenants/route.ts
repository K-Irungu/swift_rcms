import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Tenant } from "@/lib/models/Tenant";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveAndAuthorize(unitId: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const unit = await Unit.findById(unitId);
  if (!unit) return { ok: false as const, res: errorResponse("Unit not found", 404) };

  const property = await Property.findById(unit.propertyId, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  if (!isOwner && !isManager) return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const };
}

// ─── GET — all tenants who ever occupied this unit ────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch {
      return errorResponse("Invalid unit ID", 400);
    }

    const tenants = await Tenant.find(
      {
        $or: [
          { unitId: objectId },
          { "leaseRecord.unitId": objectId },
        ],
      },
      {
        _id: 1,
        fullName: 1,
        onboardingStatus: 1,
        createdAt: 1,
        "leaseRecord.startDate": 1,
        "leaseRecord.endDate": 1,
        "leaseRecord.rentAmount": 1,
      },
    )
      .lean()
      .sort({ "leaseRecord.startDate": -1, createdAt: -1 });

    return successResponse(tenants, "Tenants fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch tenants",
      500,
    );
  }
}
