import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Tenant, OnboardingStatus } from "@/lib/models/Tenant";
import { Unit } from "@/lib/models/Unit";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveTenantAndAuthorize(tenantId: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const tenant = await Tenant.findById(tenantId).populate("unitId", "unitNumber");
  if (!tenant) return { ok: false as const, res: errorResponse("Tenant not found", 404) };

  const property = await Property.findById(
    tenant.propertyId,
    { ownerId: 1, propertyManager: 1, propertyName: 1, slug: 1 },
  );
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager &&
    String(property.propertyManager) === authUser.userId;

  if (!isOwner && !isManager)
    return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const, tenant, property, authUser };
}

// ─── GET /api/tenants/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveTenantAndAuthorize(id);
    if (!auth.ok) return auth.res;

    return successResponse(
      {
        ...auth.tenant.toObject(),
        property: {
          _id:          auth.property._id,
          propertyName: auth.property.propertyName,
          slug:         auth.property.slug,
        },
      },
      "Tenant fetched",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch tenant", 500);
  }
}

// ─── PATCH /api/tenants/[id] — edit basic info ────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveTenantAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const {
      fullName, email, phone, nationalId,
      emergencyContactName, emergencyContactPhone,
      notes,
    } = body;

    if (fullName   !== undefined && !fullName?.trim())   return errorResponse("Full name cannot be empty", 400);
    if (phone      !== undefined && !phone?.trim())      return errorResponse("Phone cannot be empty", 400);
    if (nationalId !== undefined && !nationalId?.trim()) return errorResponse("National ID cannot be empty", 400);

    const update: Record<string, unknown> = {};
    if (fullName              !== undefined) update.fullName              = fullName.trim();
    if (email                 !== undefined) update.email                 = email?.trim() || undefined;
    if (phone                 !== undefined) update.phone                 = phone.trim();
    if (nationalId            !== undefined) update.nationalId            = nationalId.trim();
    if (emergencyContactName  !== undefined) update.emergencyContactName  = emergencyContactName?.trim()  || undefined;
    if (emergencyContactPhone !== undefined) update.emergencyContactPhone = emergencyContactPhone?.trim() || undefined;
    if (notes                 !== undefined) update.notes                 = notes?.trim() || undefined;

    await Tenant.findByIdAndUpdate(id, update);

    const updated = await Tenant.findById(id).populate("unitId", "unitNumber");
    return successResponse(updated, "Tenant updated");
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to update tenant", 500);
  }
}

// ─── DELETE /api/tenants/[id] — soft delete / deactivate ─────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveTenantAndAuthorize(id);
    if (!auth.ok) return auth.res;

    await Tenant.findByIdAndUpdate(id, { onboardingStatus: OnboardingStatus.INACTIVE });

    // Free the unit
    if (auth.tenant.unitId) {
      const unitId = (auth.tenant.unitId as { _id?: unknown })._id ?? auth.tenant.unitId;
      await Unit.findByIdAndUpdate(unitId, { occupancyStatus: "VACANT" });
    }

    return successResponse(null, "Tenant deactivated");
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to deactivate tenant", 500);
  }
}
