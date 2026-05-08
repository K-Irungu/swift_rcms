import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Tenant } from "@/lib/models/Tenant";
import { Lease } from "@/lib/models/Lease";
import { Invoice } from "@/lib/models/Invoice";
import { Payment } from "@/lib/models/Payment";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function resolveAndAuthorize(unitId: string, ownerOnly = false) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return { ok: false as const, res: errorResponse("Unauthorized", 401) };
  }

  await connectDB();

  const unit = await Unit.findById(unitId);
  if (!unit) {
    return { ok: false as const, res: errorResponse("Unit not found", 404) };
  }

  const property = await Property.findById(
    unit.propertyId,
    { _id: 1, ownerId: 1, propertyManager: 1, propertyName: 1, slug: 1, billing: 1, unitTypes: 1 },
  );
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

  return { ok: true as const, unit, property };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const currentTenant = await Tenant.findOne(
      { unitId: id, onboardingStatus: { $ne: "INACTIVE" } },
      { _id: 1, fullName: 1, phone: 1, email: 1, onboardingStatus: 1, leaseRecord: 1 },
    ).lean();

    const unitTypes = (auth.property.unitTypes ?? []).map((ut: { _id: unknown; name: string; rentAmount: number; depositAmount?: number; agreementFilename?: string; agreementTerms?: unknown }) => ({
      _id:              ut._id,
      name:             ut.name,
      rentAmount:       ut.rentAmount,
      depositAmount:    ut.depositAmount,
      agreementFilename: ut.agreementFilename,
      agreementTerms:   ut.agreementTerms,
    }));

    return successResponse(
      {
        ...auth.unit.toObject(),
        property: {
          _id:          auth.property._id,
          propertyName: auth.property.propertyName,
          slug:         auth.property.slug,
          billing:      auth.property.billing,
          unitTypes,
        },
        currentTenant: currentTenant ?? null,
      },
      "Unit fetched",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch unit",
      500,
    );
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id); // owner or manager
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { unitNumber, rentAmount, depositAmount, occupancyStatus, leaseTerms } = body;

    // ─── Validate provided fields ────────────────────────────────────────────

    if (unitNumber !== undefined && (!unitNumber || !unitNumber.trim())) {
      return errorResponse("unitNumber cannot be empty", 400);
    }
    if (rentAmount !== undefined && (isNaN(Number(rentAmount)) || Number(rentAmount) < 0)) {
      return errorResponse("rentAmount must be a non-negative number", 400);
    }
    if (depositAmount !== undefined && (isNaN(Number(depositAmount)) || Number(depositAmount) < 0)) {
      return errorResponse("depositAmount must be a non-negative number", 400);
    }
    if (occupancyStatus !== undefined && !["VACANT", "OCCUPIED"].includes(occupancyStatus)) {
      return errorResponse("occupancyStatus must be VACANT or OCCUPIED", 400);
    }

    // ─── Build update object from provided fields only ───────────────────────

    const update: Record<string, unknown> = {};
    if (unitNumber      !== undefined) update.unitNumber      = unitNumber.trim();
    if (rentAmount      !== undefined) update.rentAmount      = Number(rentAmount);
    if (depositAmount   !== undefined) update.depositAmount   = Number(depositAmount);
    if (occupancyStatus !== undefined) update.occupancyStatus = occupancyStatus;
    if (leaseTerms      !== undefined) update.leaseTerms      = leaseTerms;

    if (Object.keys(update).length === 0) {
      return errorResponse("No fields provided to update", 400);
    }

    const updated = await Unit.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    );

    return successResponse(updated, "Unit updated");
  } catch (error: unknown) {
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
      error instanceof Error ? error.message : "Failed to update unit",
      500,
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id, true); // owner only
    if (!auth.ok) return auth.res;

    // Cascade: payments + invoices → leases → unit
    const leaseIds = await Lease.find({ unitId: id }).distinct("_id");
    await Promise.all([
      Payment.deleteMany({ leaseId: { $in: leaseIds } }),
      Invoice.deleteMany({ leaseId: { $in: leaseIds } }),
    ]);
    await Lease.deleteMany({ unitId: id });
    await auth.unit.deleteOne();

    return successResponse(null, "Unit deleted");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete unit",
      500,
    );
  }
}
