import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { WaterRate } from "@/lib/models/WaterRate";
import { WaterMeterReading } from "@/lib/models/WaterMeterReading";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import path from "path";
import fs from "fs/promises";

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

  const property = await Property.findById(unit.propertyId, {
    _id: 1, ownerId: 1, propertyManager: 1,
  });
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

  return { ok: true as const, unit, property, authUser };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
// Returns the full reading history for the unit, newest first.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const readings = await WaterMeterReading.find({ unitId: id })
      .sort({ readingDate: -1 })
      .lean();

    return successResponse(readings, "Water readings fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch water readings",
      500,
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// Records a new meter reading for the unit.
// Looks up the current water rate and the previous reading automatically —
// the caller only needs to supply the raw meter value and the reading date.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id); // owner or manager
    if (!auth.ok) return auth.res;

    const ct = req.headers.get("content-type") ?? "";
    let reading: unknown, readingDate: string | undefined, photoFile: File | undefined;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      reading     = form.get("reading");
      readingDate = form.get("readingDate") as string | undefined;
      const f     = form.get("photo");
      if (f instanceof File && f.size > 0) photoFile = f;
    } else {
      const body  = await req.json();
      reading     = body.reading;
      readingDate = body.readingDate;
    }

    // ─── Validate input ───────────────────────────────────────────────────────

    if (reading === undefined || reading === null || isNaN(Number(reading)) || Number(reading) < 0) {
      return errorResponse("reading must be a non-negative number", 400);
    }

    const parsedDate = readingDate ? new Date(readingDate) : new Date();
    if (isNaN(parsedDate.getTime())) {
      return errorResponse("readingDate must be a valid date", 400);
    }

    // ─── Handle optional photo ────────────────────────────────────────────────

    let photoUrl: string | undefined;
    if (photoFile) {
      const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED.includes(photoFile.type)) {
        return errorResponse("Photo must be a JPEG, PNG, or WebP image", 400);
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        return errorResponse("Photo must be under 5 MB", 400);
      }
      const dir      = path.join(process.cwd(), "public", "uploads", "water-readings");
      await fs.mkdir(dir, { recursive: true });
      const ext      = photoFile.type === "image/png" ? ".png" : photoFile.type === "image/webp" ? ".webp" : ".jpg";
      const filename = `${Date.now()}-${id}${ext}`;
      await fs.writeFile(path.join(dir, filename), Buffer.from(await photoFile.arrayBuffer()));
      photoUrl = `/uploads/water-readings/${filename}`;
    }

    // ─── Fetch current water rate ─────────────────────────────────────────────

    const currentRate = await WaterRate.findOne({ propertyId: auth.property._id })
      .sort({ effectiveFrom: -1 });

    if (!currentRate) {
      return errorResponse(
        "No water rate has been configured for this property. Set a rate before recording readings.",
        422,
      );
    }

    // ─── Fetch previous reading ───────────────────────────────────────────────
    // If this is the first reading for the unit, previousReading defaults to 0.

    const lastReading = await WaterMeterReading.findOne({ unitId: id })
      .sort({ readingDate: -1 });

    const previousReading = lastReading ? lastReading.reading : 0;

    // ─── Guard against meter regression ──────────────────────────────────────

    if (Number(reading) < previousReading) {
      return errorResponse(
        `Reading (${reading}) cannot be less than the previous reading (${previousReading})`,
        400,
      );
    }

    // ─── Compute derived values ───────────────────────────────────────────────

    const consumption = Number(reading) - previousReading;
    const rateUsed    = currentRate.ratePerUnit;
    const amount      = consumption * rateUsed;

    // ─── Save ─────────────────────────────────────────────────────────────────

    const meterReading = await WaterMeterReading.create({
      unitId:          auth.unit._id,
      propertyId:      auth.property._id,
      readingDate:     parsedDate,
      reading:         Number(reading),
      previousReading,
      consumption,
      rateUsed,
      amount,
      recordedBy:      auth.authUser.userId,
      ...(photoUrl ? { photoUrl } : {}),
    });

    return successResponse(meterReading, "Water reading recorded", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to record water reading",
      500,
    );
  }
}
