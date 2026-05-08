import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Tenant } from "@/lib/models/Tenant";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveAndAuthorize(slug: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const property = await Property.findOne({ slug }, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager &&
    String(property.propertyManager) === authUser.userId;

  if (!isOwner && !isManager)
    return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const, property, authUser };
}

// ─── GET /api/properties/[id]/tenants ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const tenants = await Tenant.find({ propertyId: auth.property._id })
      .populate("unitId", "unitNumber")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(tenants, "Tenants fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch tenants", 500);
  }
}

// ─── POST /api/properties/[id]/tenants ────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { fullName, email, phone, nationalId, emergencyContactName, emergencyContactPhone, notes } = body;

    if (!fullName?.trim())   return errorResponse("Full name is required", 400);
    if (!phone?.trim())      return errorResponse("Phone number is required", 400);
    if (!nationalId?.trim()) return errorResponse("National ID is required", 400);

    const tenant = await Tenant.create({
      fullName:              fullName.trim(),
      email:                 email?.trim() || undefined,
      phone:                 phone.trim(),
      nationalId:            nationalId.trim(),
      propertyId:            auth.property._id,
      emergencyContactName:  emergencyContactName?.trim()  || undefined,
      emergencyContactPhone: emergencyContactPhone?.trim() || undefined,
      notes:                 notes?.trim() || undefined,
      onboardingStatus:      "PENDING",
      createdBy:             auth.authUser.userId,
    });

    return successResponse(tenant, "Tenant created — complete onboarding to activate", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to add tenant", 500);
  }
}
