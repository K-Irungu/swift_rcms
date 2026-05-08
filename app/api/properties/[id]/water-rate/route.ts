import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { WaterRate } from "@/lib/models/WaterRate";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function resolveAndAuthorize(slug: string, ownerOnly = false) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return { ok: false as const, res: errorResponse("Unauthorized", 401) };
  }

  await connectDB();

  const property = await Property.findOne({ slug }, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) {
    return { ok: false as const, res: errorResponse("Property not found", 404) };
  }

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager &&
    String(property.propertyManager) === authUser.userId;
  const allowed   = ownerOnly ? isOwner : (isOwner || !!isManager);

  if (!allowed) {
    return { ok: false as const, res: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const, property, authUser };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
// Returns the current rate and the full rate history for the property.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const history = await WaterRate.find({ propertyId: auth.property._id })
      .sort({ effectiveFrom: -1 })
      .lean();

    const current = history[0] ?? null;

    return successResponse({ current, history }, "Water rate fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch water rate",
      500,
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// Sets a new rate. Creates a new record — never overwrites existing ones so
// historical readings remain accurate.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id, true); // owner only
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { ratePerUnit, effectiveFrom } = body;

    // ─── Validate ────────────────────────────────────────────────────────────

    if (ratePerUnit === undefined || ratePerUnit === null || isNaN(Number(ratePerUnit)) || Number(ratePerUnit) < 0) {
      return errorResponse("ratePerUnit must be a non-negative number", 400);
    }

    const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
    if (isNaN(effectiveDate.getTime())) {
      return errorResponse("effectiveFrom must be a valid date", 400);
    }

    // ─── Prevent duplicate rate for the same effective date ──────────────────

    const existing = await WaterRate.findOne({
      propertyId:    auth.property._id,
      effectiveFrom: effectiveDate,
    });
    if (existing) {
      return errorResponse("A rate with this effective date already exists", 409);
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    const rate = await WaterRate.create({
      propertyId:    auth.property._id,
      ratePerUnit:   Number(ratePerUnit),
      effectiveFrom: effectiveDate,
      createdBy:     auth.authUser.userId,
    });

    return successResponse(rate, "Water rate set", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to set water rate",
      500,
    );
  }
}
