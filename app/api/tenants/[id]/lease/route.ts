import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Tenant, OnboardingStatus } from "@/lib/models/Tenant";
import { Unit } from "@/lib/models/Unit";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import path from "path";
import fs from "fs/promises";

async function authorize(tenantId: string, ownerOnly = false) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };
  await connectDB();
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return { ok: false as const, res: errorResponse("Tenant not found", 404) };
  const property = await Property.findById(tenant.propertyId, { ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };
  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  if (ownerOnly ? !isOwner : (!isOwner && !isManager))
    return { ok: false as const, res: errorResponse("Forbidden", 403) };
  return { ok: true as const, tenant, property, authUser };
}

// ─── POST — record lease terms and mark as signed ─────────────────────────────
// Accepts JSON body (set terms) or multipart (upload signed document).
// If the signed document is attached it is saved to private/leases/[tenantId].

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) return auth.res;

    if (auth.tenant.onboardingStatus !== OnboardingStatus.KYC_APPROVED)
      return errorResponse("KYC must be approved before signing the lease", 400);

    const ct = req.headers.get("content-type") ?? "";

    let unitId: string, startDate: string, endDate: string,
        rentAmount: number, depositAmount: number,
        signedDocumentBuffer: Buffer | undefined,
        signedDocumentName: string | undefined;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      unitId         = form.get("unitId")        as string;
      startDate      = form.get("startDate")     as string;
      endDate        = form.get("endDate")       as string;
      rentAmount     = Number(form.get("rentAmount"));
      depositAmount  = Number(form.get("depositAmount"));
      const file     = form.get("signedDocument") as File | null;
      if (file) {
        signedDocumentBuffer = Buffer.from(await file.arrayBuffer());
        signedDocumentName   = file.name;
      }
    } else {
      const body = await req.json();
      ({ unitId, startDate, endDate } = body);
      rentAmount    = Number(body.rentAmount);
      depositAmount = Number(body.depositAmount);
    }

    if (!unitId)        return errorResponse("unitId is required", 400);
    if (!startDate)     return errorResponse("startDate is required", 400);
    if (!endDate)       return errorResponse("endDate is required", 400);
    if (isNaN(rentAmount)    || rentAmount    < 0) return errorResponse("rentAmount must be ≥ 0", 400);
    if (isNaN(depositAmount) || depositAmount < 0) return errorResponse("depositAmount must be ≥ 0", 400);

    const unit = await Unit.findOne({ _id: unitId, propertyId: auth.tenant.propertyId });
    if (!unit) return errorResponse("Unit not found on this property", 400);

    let documentPath: string | undefined;
    if (signedDocumentBuffer && signedDocumentName) {
      const dir = path.join(process.cwd(), "private", "leases");
      await fs.mkdir(dir, { recursive: true });
      const ext  = path.extname(signedDocumentName).toLowerCase() || ".pdf";
      documentPath = path.join(dir, `${id}${ext}`);
      await fs.writeFile(documentPath, signedDocumentBuffer);
    }

    await Tenant.findByIdAndUpdate(id, {
      onboardingStatus: OnboardingStatus.LEASE_SIGNED,
      unitId,
      leaseRecord: {
        unitId,
        startDate:    new Date(startDate),
        endDate:      new Date(endDate),
        rentAmount,
        depositAmount,
        signedAt:     new Date(),
        ...(documentPath ? { documentPath } : {}),
      },
    });

    // Mark unit as occupied
    await Unit.findByIdAndUpdate(unitId, { occupancyStatus: "OCCUPIED" });

    return successResponse(
      { status: OnboardingStatus.LEASE_SIGNED, unitId, rentAmount, depositAmount },
      "Lease signed — awaiting move-in payment",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to record lease", 500);
  }
}

// ─── GET — download signed lease document ────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) return auth.res;

    const documentPath = auth.tenant.leaseRecord?.documentPath;
    if (!documentPath) return errorResponse("No signed lease document on file", 404);

    const buffer   = await fs.readFile(documentPath);
    const ext      = path.extname(documentPath).toLowerCase() || ".pdf";
    const mime     = ext === ".pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const filename = `lease-${id}${ext}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":        mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to download lease", 500);
  }
}
