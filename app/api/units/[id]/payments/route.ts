import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Tenant } from "@/lib/models/Tenant";
import { Lease } from "@/lib/models/Lease";
import { Payment, PaymentMethod } from "@/lib/models/Payment";
import { WaterMeterReading } from "@/lib/models/WaterMeterReading";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

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

  return { ok: true as const, unit };
}

// ─── GET — unified payment history for a unit ─────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch {
      return errorResponse("Invalid unit ID", 400);
    }

    // ─── Move-in payments (deposit + first rent) from tenant onboarding ────────

    const tenants = await Tenant.find(
      {
        $or: [
          { unitId: objectId },
          { "leaseRecord.unitId": objectId },
        ],
      },
      { _id: 1, fullName: 1, moveInPayment: 1, leaseRecord: 1, createdAt: 1 },
    ).lean();

    const moveInEntries: PaymentEntry[] = [];

    for (const t of tenants) {
      const mp = t.moveInPayment as {
        depositReceived?: number; depositReference?: string; depositReceivedAt?: Date;
        firstRentReceived?: number; firstRentReference?: string; firstRentReceivedAt?: Date;
      } | undefined;
      if (!mp) continue;

      if (mp.depositReceived && mp.depositReceived > 0) {
        moveInEntries.push({
          _id:        `${String(t._id)}-deposit`,
          type:       "deposit",
          date:       (mp.depositReceivedAt ?? t.createdAt as Date).toISOString(),
          amount:     mp.depositReceived,
          tenantName: t.fullName as string,
          reference:  mp.depositReference,
        });
      }
      if (mp.firstRentReceived && mp.firstRentReceived > 0) {
        moveInEntries.push({
          _id:        `${String(t._id)}-first-rent`,
          type:       "first_rent",
          date:       (mp.firstRentReceivedAt ?? t.createdAt as Date).toISOString(),
          amount:     mp.firstRentReceived,
          tenantName: t.fullName as string,
          reference:  mp.firstRentReference,
        });
      }
    }

    // ─── Regular rent payments via Lease + Payment models ─────────────────────

    const leases = await Lease.find({ unitId: objectId })
      .populate("tenantId", "fullName")
      .lean();

    const leaseIds = leases.map((l) => l._id);
    const payments = leaseIds.length
      ? await Payment.find({ leaseId: { $in: leaseIds } }).sort({ paymentDate: -1 }).lean()
      : [];

    const tenantNameByLease: Record<string, string> = {};
    for (const l of leases) {
      const t = l.tenantId as { fullName?: string } | null;
      tenantNameByLease[String(l._id)] = t?.fullName ?? "—";
    }

    const rentEntries: PaymentEntry[] = payments.map((p) => {
      const pfm = p.paymentForMonth as Date;
      return {
        _id:             String(p._id),
        type:            "rent",
        date:            (p.paymentDate as Date).toISOString(),
        amount:          p.amount as number,
        tenantName:      tenantNameByLease[String(p.leaseId)] ?? "—",
        reference:       p.transactionRef as string | undefined,
        paymentForMonth: `${pfm.getFullYear()}-${String(pfm.getMonth() + 1).padStart(2, "0")}`,
        paymentMethod:   p.paymentMethod as string,
      };
    });

    // ─── Water billing charges ─────────────────────────────────────────────────

    const waterReadings = await WaterMeterReading.find({ unitId: objectId })
      .sort({ readingDate: -1 })
      .lean();

    const waterEntries: PaymentEntry[] = waterReadings.map((w) => ({
      _id:        String(w._id),
      type:       "water",
      date:       (w.readingDate as Date).toISOString(),
      amount:     w.amount as number,
      tenantName: "—",
    }));

    // ─── Combine and sort by date desc ────────────────────────────────────────

    const all = [...moveInEntries, ...rentEntries, ...waterEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return successResponse(all, "Payments fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch payments",
      500,
    );
  }
}

// ─── POST — log a manual rent payment ─────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { amount, paymentMethod, transactionRef, paymentForMonth, paymentDate } = body;

    // ─── Validate ────────────────────────────────────────────────────────────

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return errorResponse("amount must be a positive number", 400);
    }
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return errorResponse("paymentMethod must be MPESA, BANK_TRANSFER, or CASH", 400);
    }
    if (!transactionRef?.trim()) {
      return errorResponse("transactionRef is required", 400);
    }
    if (!paymentForMonth || !/^\d{4}-\d{2}$/.test(paymentForMonth)) {
      return errorResponse("paymentForMonth must be in YYYY-MM format", 400);
    }

    // ─── Find active lease for this unit ─────────────────────────────────────

    const objectId = new mongoose.Types.ObjectId(id);
    const lease = await Lease.findOne({ unitId: objectId, status: "ACTIVE" })
      .populate("tenantId", "fullName")
      .lean();

    if (!lease) {
      return errorResponse(
        "No active lease found for this unit. Payments can only be logged against an active lease.",
        400,
      );
    }

    // ─── Parse dates ─────────────────────────────────────────────────────────

    const [y, m] = paymentForMonth.split("-").map(Number);
    const paymentForMonthDate = new Date(y, m - 1, 1);
    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(paymentDateObj.getTime())) {
      return errorResponse("paymentDate must be a valid date", 400);
    }

    // ─── Create payment ───────────────────────────────────────────────────────

    const payment = await Payment.create({
      leaseId:         lease._id,
      amount:          Number(amount),
      paymentDate:     paymentDateObj,
      paymentMethod,
      transactionRef:  transactionRef.trim(),
      paymentForMonth: paymentForMonthDate,
    });

const tenantName = (lease.tenantId as { fullName?: string } | null)?.fullName ?? "—";

    return successResponse(
      {
        _id:             String(payment._id),
        type:            "rent",
        date:            payment.paymentDate.toISOString(),
        amount:          payment.amount,
        tenantName,
        reference:       payment.transactionRef,
        paymentForMonth,
        paymentMethod:   payment.paymentMethod,
      } satisfies PaymentEntry,
      "Payment logged",
      201,
    );
  } catch (error) {
if ((error as { code?: number })?.code === 11000) {
      return errorResponse("A payment with this transaction reference already exists", 409);
    }
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to log payment",
      500,
    );
  }
}

// ─── Shared type (used by both GET and POST) ──────────────────────────────────

type PaymentEntry = {
  _id:             string;
  type:            "deposit" | "first_rent" | "rent" | "water";
  date:            string;
  amount:          number;
  tenantName:      string;
  reference?:      string;
  paymentForMonth?: string;
  paymentMethod?:  string;
};
