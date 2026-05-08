import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { connectDB } from "@/lib/db";
import { Tenant, OnboardingStatus } from "@/lib/models/Tenant";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

async function authorize(tenantId: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };
  await connectDB();
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return { ok: false as const, res: errorResponse("Tenant not found", 404) };
  const property = await Property.findById(tenant.propertyId, { ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };
  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  if (!isOwner && !isManager) return { ok: false as const, res: errorResponse("Forbidden", 403) };
  return { ok: true as const, tenant, authUser };
}

async function saveFile(buffer: Buffer, tenantId: string, slot: string, originalName: string) {
  const dir  = path.join(process.cwd(), "private", "kyc", tenantId);
  await fs.mkdir(dir, { recursive: true });
  const ext      = path.extname(originalName).toLowerCase() || ".bin";
  const filename = `${slot}${ext}`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// ─── POST — upload KYC documents ─────────────────────────────────────────────
// Expects multipart/form-data with:
//   idType: "national_id" | "passport"
//   idFront: File  (required)
//   idBack:  File  (optional, not needed for passport)
//   selfie:  File  (optional)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) return auth.res;

    if (auth.tenant.onboardingStatus === OnboardingStatus.INACTIVE)
      return errorResponse("Cannot update an inactive tenant", 400);

    const form = await req.formData();
    const idType  = form.get("idType") as string;
    const idFront = form.get("idFront") as File | null;

    if (!idType || !["national_id", "passport"].includes(idType))
      return errorResponse("idType must be 'national_id' or 'passport'", 400);

    if (!idFront) return errorResponse("idFront document is required", 400);
    if (!ALLOWED_TYPES.includes(idFront.type)) return errorResponse("File must be JPG, PNG, WebP, or PDF", 400);
    if (idFront.size > MAX_SIZE) return errorResponse("File exceeds 10 MB limit", 400);

    const tenantId = String(auth.tenant._id);

    // Delete old KYC files if re-submitting after rejection
    if (auth.tenant.onboardingStatus === OnboardingStatus.KYC_REJECTED) {
      const dir = path.join(process.cwd(), "private", "kyc", tenantId);
      await fs.rm(dir, { recursive: true, force: true });
    }

    const idFrontPath = await saveFile(
      Buffer.from(await idFront.arrayBuffer()), tenantId, "id_front", idFront.name,
    );

    let idBackPath: string | undefined;
    const idBack = form.get("idBack") as File | null;
    if (idBack && idType === "national_id") {
      if (!ALLOWED_TYPES.includes(idBack.type)) return errorResponse("idBack: file must be JPG, PNG, WebP, or PDF", 400);
      if (idBack.size > MAX_SIZE) return errorResponse("idBack: file exceeds 10 MB", 400);
      idBackPath = await saveFile(Buffer.from(await idBack.arrayBuffer()), tenantId, "id_back", idBack.name);
    }

    let selfiePath: string | undefined;
    const selfie = form.get("selfie") as File | null;
    if (selfie) {
      if (!ALLOWED_TYPES.includes(selfie.type)) return errorResponse("Selfie: file must be JPG, PNG, or WebP", 400);
      if (selfie.size > MAX_SIZE) return errorResponse("Selfie: file exceeds 10 MB", 400);
      selfiePath = await saveFile(Buffer.from(await selfie.arrayBuffer()), tenantId, "selfie", selfie.name);
    }

    await Tenant.findByIdAndUpdate(id, {
      onboardingStatus: OnboardingStatus.DOCUMENTS_SUBMITTED,
      kyc: {
        idType,
        idFrontPath,
        ...(idBackPath  ? { idBackPath }  : {}),
        ...(selfiePath  ? { selfiePath }  : {}),
        submittedAt: new Date(),
      },
    });

    return successResponse({ idType, hasIdBack: !!idBackPath, hasSelfie: !!selfiePath }, "Documents uploaded — awaiting KYC review", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Upload failed", 500);
  }
}

// ─── GET — serve a KYC document ───────────────────────────────────────────────
// ?doc=id_front | id_back | selfie

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) return auth.res;

    const doc = new URL(req.url).searchParams.get("doc");
    if (!["id_front", "id_back", "selfie"].includes(doc ?? ""))
      return errorResponse("doc must be id_front, id_back, or selfie", 400);

    const kyc = auth.tenant.kyc;
    if (!kyc) return errorResponse("No KYC documents on file", 404);

    const pathMap: Record<string, string | undefined> = {
      id_front: kyc.idFrontPath,
      id_back:  kyc.idBackPath,
      selfie:   kyc.selfiePath,
    };
    const filePath = pathMap[doc!];
    if (!filePath) return errorResponse("Document not found", 404);

    const buffer   = await fs.readFile(filePath);
    const ext      = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
    const mime     = mimeMap[ext] ?? "application/octet-stream";
    const filename = `${doc}${ext}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        mime,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to serve document", 500);
  }
}
