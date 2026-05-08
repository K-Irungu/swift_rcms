import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Tenant } from "@/lib/models/Tenant";
import { Maintenance } from "@/lib/models/Maintenance";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import path from "path";
import fs from "fs/promises";

const URGENCY_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;

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

  return { ok: true as const, unit, property };
}

// ─── GET — full maintenance history for a unit ────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const records = await Maintenance.find({ unitId: id })
      .populate("tenantId", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(records, "Maintenance records fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch maintenance records",
      500,
    );
  }
}

// ─── POST — log a new maintenance request ────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const ct = req.headers.get("content-type") ?? "";
    let issueDescription: string, urgency: string, photoFile: File | undefined;

    if (ct.includes("multipart/form-data")) {
      const form    = await req.formData();
      issueDescription = (form.get("issueDescription") as string) ?? "";
      urgency          = (form.get("urgency") as string) ?? "MEDIUM";
      const f          = form.get("photo");
      if (f instanceof File && f.size > 0) photoFile = f;
    } else {
      const body       = await req.json();
      issueDescription = body.issueDescription ?? "";
      urgency          = body.urgency ?? "MEDIUM";
    }

    if (!issueDescription.trim()) {
      return errorResponse("issueDescription is required", 400);
    }
    if (!URGENCY_VALUES.includes(urgency as typeof URGENCY_VALUES[number])) {
      return errorResponse("urgency must be LOW, MEDIUM, or HIGH", 400);
    }

    // ─── Optional photo ───────────────────────────────────────────────────────

    let photoUrl: string | undefined;
    if (photoFile) {
      const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED.includes(photoFile.type)) {
        return errorResponse("Photo must be JPEG, PNG, or WebP", 400);
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        return errorResponse("Photo must be under 5 MB", 400);
      }
      const dir      = path.join(process.cwd(), "public", "uploads", "maintenance");
      await fs.mkdir(dir, { recursive: true });
      const ext      = photoFile.type === "image/png" ? ".png" : photoFile.type === "image/webp" ? ".webp" : ".jpg";
      const filename = `${Date.now()}-${id}${ext}`;
      await fs.writeFile(path.join(dir, filename), Buffer.from(await photoFile.arrayBuffer()));
      photoUrl = `/uploads/maintenance/${filename}`;
    }

    // ─── Resolve current tenant (optional) ───────────────────────────────────

    const currentTenant = await Tenant.findOne(
      { unitId: id, onboardingStatus: { $ne: "INACTIVE" } },
      { _id: 1 },
    ).lean();

    const record = await Maintenance.create({
      unitId:           auth.unit._id,
      tenantId:         currentTenant?._id ?? null,
      issueDescription: issueDescription.trim(),
      urgency,
      status:           "PENDING",
      ...(photoUrl ? { photoUrl } : {}),
    });

    return successResponse(record, "Maintenance record created", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create maintenance record",
      500,
    );
  }
}
