import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { propertyId, unitNumber, rentAmount, depositAmount, occupancyStatus, leaseTerms } = body;

    // ─── Validate required fields ────────────────────────────────────────────

    if (!propertyId || typeof propertyId !== "string") {
      return errorResponse("propertyId is required", 400);
    }
    if (!unitNumber || typeof unitNumber !== "string" || !unitNumber.trim()) {
      return errorResponse("unitNumber is required", 400);
    }
    if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) < 0) {
      return errorResponse("rentAmount must be a non-negative number", 400);
    }
    if (depositAmount === undefined || depositAmount === null || isNaN(Number(depositAmount)) || Number(depositAmount) < 0) {
      return errorResponse("depositAmount must be a non-negative number", 400);
    }

    await connectDB();

    // ─── Resolve property and verify ownership ───────────────────────────────

    const property = await Property.findOne({ slug: propertyId }, { _id: 1, ownerId: 1 });
    if (!property) {
      return errorResponse("Property not found", 404);
    }
    if (String(property.ownerId) !== authUser.userId) {
      return errorResponse("Forbidden", 403);
    }

    // ─── Create unit ─────────────────────────────────────────────────────────

    const unit = await Unit.create({
      propertyId:      property._id,
      unitNumber:      unitNumber.trim(),
      rentAmount:      Number(rentAmount),
      depositAmount:   Number(depositAmount),
      occupancyStatus: occupancyStatus ?? "VACANT",
      ...(leaseTerms && typeof leaseTerms === "object" ? { leaseTerms } : {}),
    });

    return successResponse(unit, "Unit created", 201);
  } catch (error: unknown) {
    // Duplicate unit number within the same property
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return errorResponse("A unit with this number already exists in this property", 409);
    }

    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create unit",
      500,
    );
  }
}
