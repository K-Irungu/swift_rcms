import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import { extractAgreementTerms } from "@/lib/utils/extractAgreementTerms";
import path from "path";
import fs from "fs/promises";

const AGREEMENTS_DIR = path.join(process.cwd(), "private", "agreements");

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function resolveAndAuthorize(slug: string) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return { ok: false as const, res: errorResponse("Unauthorized", 401) };
  }

  await connectDB();

  const property = await Property.findOne({ slug });
  if (!property) {
    return { ok: false as const, res: errorResponse("Property not found", 404) };
  }

  if (String(property.ownerId) !== authUser.userId) {
    return { ok: false as const, res: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const, property, authUser };
}

// ─── POST — upload agreement ──────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; typeId: string }> },
) {
  try {
    const { id: slug, typeId } = await params;
    const auth = await resolveAndAuthorize(slug);
    if (!auth.ok) return auth.res;

    const unitType = auth.property.unitTypes.id(typeId);
    if (!unitType) {
      return errorResponse("Unit type not found", 404);
    }

    const formData = await req.formData();
    const file = formData.get("agreement") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return errorResponse("File must be under 10 MB", 400);
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate .docx magic bytes (PK ZIP header)
    const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (!isDocx) {
      return errorResponse("Only .docx files are allowed", 400);
    }

    await fs.mkdir(AGREEMENTS_DIR, { recursive: true });

    // Remove old file if one exists
    if (unitType.agreementPath) {
      await fs.unlink(unitType.agreementPath).catch(() => undefined);
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName   = `${Date.now()}-${auth.property.slug}-${typeId}-${safeFilename}`;
    const storedPath   = path.join(AGREEMENTS_DIR, storedName);

    await fs.writeFile(storedPath, buffer);

    unitType.agreementPath     = storedPath;
    unitType.agreementFilename = file.name;

    // Extract structured lease terms using AI.
    let agreementTerms = {};
    let extractionError: string | null = null;
    try {
      agreementTerms = await extractAgreementTerms(buffer);
      unitType.agreementTerms = agreementTerms;
    } catch (extractErr) {
      extractionError = extractErr instanceof Error ? extractErr.message : "Extraction failed";
      console.error("Agreement term extraction failed:", extractErr);
    }

    await auth.property.save();

    return successResponse(
      { agreementFilename: file.name, agreementTerms, extractionError },
      extractionError ? "Agreement uploaded but term extraction failed" : "Agreement uploaded",
      201,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to upload agreement",
      500,
    );
  }
}

// ─── GET — download agreement ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; typeId: string }> },
) {
  try {
    const { id: slug, typeId } = await params;
    const auth = await resolveAndAuthorize(slug);
    if (!auth.ok) return auth.res;

    const unitType = auth.property.unitTypes.id(typeId);
    if (!unitType) {
      return errorResponse("Unit type not found", 404);
    }

    if (!unitType.agreementPath || !unitType.agreementFilename) {
      return errorResponse("No agreement on file for this unit type", 404);
    }

    const buffer = await fs.readFile(unitType.agreementPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(unitType.agreementFilename)}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to download agreement",
      500,
    );
  }
}

// ─── DELETE — remove agreement ────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; typeId: string }> },
) {
  try {
    const { id: slug, typeId } = await params;
    const auth = await resolveAndAuthorize(slug);
    if (!auth.ok) return auth.res;

    const unitType = auth.property.unitTypes.id(typeId);
    if (!unitType) {
      return errorResponse("Unit type not found", 404);
    }

    if (!unitType.agreementPath) {
      return errorResponse("No agreement on file for this unit type", 404);
    }

    await fs.unlink(unitType.agreementPath).catch(() => undefined);

    unitType.agreementPath     = undefined;
    unitType.agreementFilename = undefined;
    unitType.agreementTerms    = undefined;
    await auth.property.save();

    return successResponse(null, "Agreement removed");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to remove agreement",
      500,
    );
  }
}
