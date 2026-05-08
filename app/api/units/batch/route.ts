import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

const MAX_BATCH = 50;

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const { propertyId, unitNumbers, rentAmount, depositAmount, occupancyStatus, leaseTerms } = body;

    // ─── Validate ────────────────────────────────────────────────────────────

    if (!propertyId || typeof propertyId !== "string")
      return errorResponse("propertyId is required", 400);

    if (!Array.isArray(unitNumbers) || unitNumbers.length === 0)
      return errorResponse("unitNumbers must be a non-empty array", 400);

    if (unitNumbers.length > MAX_BATCH)
      return errorResponse(`Maximum ${MAX_BATCH} units per batch`, 400);

    const cleaned: string[] = unitNumbers
      .map((n: unknown) => (typeof n === "string" ? n.trim() : ""))
      .filter(Boolean);

    if (cleaned.length === 0)
      return errorResponse("No valid unit numbers provided", 400);

    // Check for duplicates within the submitted list
    const unique = [...new Set(cleaned)];
    if (unique.length !== cleaned.length)
      return errorResponse("Duplicate unit numbers in the submitted list", 400);

    if (isNaN(Number(rentAmount)) || Number(rentAmount) < 0)
      return errorResponse("rentAmount must be a non-negative number", 400);

    if (isNaN(Number(depositAmount)) || Number(depositAmount) < 0)
      return errorResponse("depositAmount must be a non-negative number", 400);

    await connectDB();

    // ─── Resolve property & ownership ────────────────────────────────────────

    const property = await Property.findOne({ slug: propertyId }, { _id: 1, ownerId: 1 });
    if (!property) return errorResponse("Property not found", 404);
    if (String(property.ownerId) !== authUser.userId)
      return errorResponse("Forbidden", 403);

    // ─── Check which numbers already exist ───────────────────────────────────

    const existing = await Unit.find(
      { propertyId: property._id, unitNumber: { $in: unique } },
      { unitNumber: 1 },
    ).lean();
    const existingSet = new Set(existing.map((u) => u.unitNumber));

    const toCreate = unique.filter((n) => !existingSet.has(n));
    const skipped  = unique.filter((n) =>  existingSet.has(n));

    // ─── Bulk insert ─────────────────────────────────────────────────────────

    const docs = toCreate.map((unitNumber) => ({
      propertyId:      property._id,
      unitNumber,
      rentAmount:      Number(rentAmount),
      depositAmount:   Number(depositAmount),
      occupancyStatus: occupancyStatus ?? "VACANT",
      ...(leaseTerms && typeof leaseTerms === "object" ? { leaseTerms } : {}),
    }));

    let created: string[] = [];
    if (docs.length > 0) {
      const inserted = await Unit.insertMany(docs, { ordered: false });
      created = inserted.map((u) => u.unitNumber);
    }

    return successResponse(
      { created, skipped, total: unique.length },
      `${created.length} unit${created.length !== 1 ? "s" : ""} created${skipped.length ? `, ${skipped.length} already existed` : ""}`,
      201,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Batch creation failed",
      500,
    );
  }
}
