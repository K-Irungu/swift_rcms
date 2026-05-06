import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import "@/lib/models/User";
import { Unit } from "@/lib/models/Unit";
import { Lease } from "@/lib/models/Lease";
import { Invoice } from "@/lib/models/Invoice";
import { Payment } from "@/lib/models/Payment";
import { getCurrentUser } from "@/lib/utils/auth";
import path from "path";
import fs from "fs/promises";

// ─── Auth helper ──────────────────────────────────────────────────────────────
// ownerOnly=true  → only the property owner may proceed
// ownerOnly=false → owner OR the assigned property manager may proceed

async function resolveAndAuthorize(slug: string, ownerOnly = false) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  await connectDB();

  const property = await Property.findOne({ slug });


  console.log("Resolved property:", property)

  
  if (!property) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Property not found" }, { status: 404 }),
    };
  }

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager &&
    String(property.propertyManager) === authUser.userId;

  const allowed = ownerOnly ? isOwner : (isOwner || !!isManager);
  if (!allowed) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, property };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    await auth.property.populate("propertyManager", "_id fullName email");
    return NextResponse.json(auth.property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property" },
      { status: 500 },
    );
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id, true); // owner only
    if (!auth.ok) return auth.res;

    const body = await req.json();

    if (!body.propertyName?.trim()) {
      return NextResponse.json({ error: "Property name is required" }, { status: 400 });
    }
    if (body.billing?.rentDueDay !== undefined) {
      const day = Number(body.billing.rentDueDay);
      if (!Number.isInteger(day) || day < 1 || day > 28) {
        return NextResponse.json(
          { error: "Rent due day must be between 1 and 28" },
          { status: 400 },
        );
      }
    }

    const allowedUpdate = {
      propertyName: body.propertyName.trim(),
      description:  body.description,
      location:     body.location,
      unitTypes:    body.unitTypes,
      billing:      body.billing,
      updatedAt:    new Date(),
    };

    const property = await Property.findByIdAndUpdate(
      auth.property._id,
      { $set: allowedUpdate },
      { new: true, runValidators: true },
    );

    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update property" },
      { status: 500 },
    );
  }
}

// ─── PATCH (cover photo) ─────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id, true); // owner only
    if (!auth.ok) return auth.res;

    const formData = await req.formData();
    const file = formData.get("coverPhoto") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate by magic bytes — never trust client-supplied MIME type
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng  = buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47; // \x89PNG
    const isWebp = buffer.length > 12 &&
      buffer.slice(8, 12).toString("ascii") === "WEBP";

    if (!isJpeg && !isPng && !isWebp) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 },
      );
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const ext      = isJpeg ? "jpg" : isPng ? "png" : "webp";
    const filename = `${Date.now()}-${auth.property.slug}.${ext}`;
    const filepath = path.join(process.cwd(), "public/uploads", filename);
    await fs.writeFile(filepath, buffer);
    const coverPhotoUrl = `/uploads/${filename}`;

    await Property.findByIdAndUpdate(auth.property._id, {
      $set: { coverPhotoUrl, updatedAt: new Date() },
    });

    return NextResponse.json({ coverPhotoUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload photo" },
      { status: 500 },
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

    const propertyId = auth.property._id;

    // Cascade delete leaf → root so no orphaned records remain
    const unitIds  = await Unit.find({ propertyId }).distinct("_id");
    const leaseIds = await Lease.find({ unitId: { $in: unitIds } }).distinct("_id");

    await Promise.all([
      Payment.deleteMany({ leaseId: { $in: leaseIds } }),
      Invoice.deleteMany({ leaseId: { $in: leaseIds } }),
      Lease.deleteMany({ unitId: { $in: unitIds } }),
      Unit.deleteMany({ propertyId }),
    ]);

    await auth.property.deleteOne();

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete property" },
      { status: 500 },
    );
  }
}
