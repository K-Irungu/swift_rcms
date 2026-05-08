import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Lease } from "@/lib/models/Lease";
import { Payment } from "@/lib/models/Payment";
import { WaterMeterReading } from "@/lib/models/WaterMeterReading";
import { Expense } from "@/lib/models/Expense";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveAndAuthorize(slug: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const property = await Property.findOne({ slug }, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  if (!isOwner && !isManager) return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const, property };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    // ─── Parse month param (default: current month) ───────────────────────────

    const monthParam = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
    const now = new Date();
    let year  = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      year  = y;
      month = m - 1;
    }

    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 1);

    const propertyId = auth.property._id;

    // ─── 1. All units for this property ──────────────────────────────────────

    const units = await Unit.find(
      { propertyId },
      { _id: 1, unitNumber: 1, rentAmount: 1, occupancyStatus: 1 },
    ).lean();

    const unitIds = units.map((u) => u._id);

    // ─── 2. Active leases for those units, with tenant names ─────────────────

    const activeLeases = await Lease.find(
      { unitId: { $in: unitIds }, status: "ACTIVE" },
      { _id: 1, unitId: 1, tenantId: 1, monthlyRent: 1 },
    )
      .populate("tenantId", "fullName")
      .lean();

    // ─── 3. Payments for active leases in the selected month ─────────────────

    const activeLeaseIds = activeLeases.map((l) => l._id);

    const monthPayments = await Payment.find({
      leaseId:        { $in: activeLeaseIds },
      paymentForMonth: { $gte: monthStart, $lt: monthEnd },
    }).lean();

    // ─── 4. Build rent roll ───────────────────────────────────────────────────

    const leaseByUnitId     = new Map(activeLeases.map((l) => [String(l.unitId), l]));
    const paymentsByLeaseId = new Map<string, typeof monthPayments[number][]>();
    for (const p of monthPayments) {
      const key = String(p.leaseId);
      if (!paymentsByLeaseId.has(key)) paymentsByLeaseId.set(key, []);
      paymentsByLeaseId.get(key)!.push(p);
    }

    const rentRoll = units
      .map((unit) => {
        const lease = leaseByUnitId.get(String(unit._id));

        if (!lease) {
          return {
            unitId:      String(unit._id),
            unitNumber:  unit.unitNumber,
            tenantName:  null as string | null,
            monthlyRent: unit.rentAmount,
            amountPaid:  0,
            balance:     0,
            status:      "VACANT" as const,
            paymentDate: null as string | null,
          };
        }

        const unitPayments = paymentsByLeaseId.get(String(lease._id)) ?? [];
        const amountPaid   = unitPayments.reduce((s, p) => s + p.amount, 0);
        const balance      = Math.max(0, lease.monthlyRent - amountPaid);
        const lastPayment  = [...unitPayments].sort(
          (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
        )[0];

        const status =
          amountPaid >= lease.monthlyRent ? "PAID" :
          amountPaid > 0                  ? "PARTIAL" :
                                            "UNPAID";

        return {
          unitId:      String(unit._id),
          unitNumber:  unit.unitNumber,
          tenantName:  (lease.tenantId as any)?.fullName ?? null,
          monthlyRent: lease.monthlyRent,
          amountPaid,
          balance,
          status:      status as "PAID" | "PARTIAL" | "UNPAID",
          paymentDate: lastPayment?.paymentDate?.toISOString() ?? null,
        };
      })
      .sort((a, b) =>
        a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
      );

    // ─── 5. Expenses for the selected month ──────────────────────────────────

    const monthExpenses = await Expense.find({
      propertyId,
      expenseDate: { $gte: monthStart, $lt: monthEnd },
    })
      .sort({ expenseDate: -1 })
      .lean();

    const expenseRows = monthExpenses.map((e) => ({
      _id:         String(e._id),
      category:    e.category,
      description: e.description,
      amount:      e.amount,
      expenseDate: e.expenseDate.toISOString(),
    }));

    // Totals by category for the breakdown chart
    const expenseByCategory: Record<string, number> = {};
    for (const e of monthExpenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
    }

    // ─── 6. Summary ──────────────────────────────────────────────────────────

    const occupied        = rentRoll.filter((r) => r.status !== "VACANT");
    const expectedRent    = occupied.reduce((s, r) => s + r.monthlyRent, 0);
    const collectedRent   = occupied.reduce((s, r) => s + r.amountPaid, 0);
    const outstandingRent = Math.max(0, expectedRent - collectedRent);
    const collectionRate  = expectedRent > 0
      ? Math.round((collectedRent / expectedRent) * 100)
      : 0;
    const totalExpenses   = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const netIncome       = collectedRent - totalExpenses;

    const summary = {
      expectedRent,
      collectedRent,
      outstandingRent,
      collectionRate,
      totalExpenses,
      netIncome,
      totalUnits:    units.length,
      occupiedUnits: occupied.length,
      vacantUnits:   units.length - occupied.length,
    };

    // ─── 7. Water readings for the selected month ─────────────────────────────

    const waterReadings = await WaterMeterReading.find({
      propertyId,
      readingDate: { $gte: monthStart, $lt: monthEnd },
    })
      .populate("unitId", "unitNumber")
      .sort({ readingDate: -1 })
      .lean();

    const tenantNameByUnitId = new Map(
      activeLeases.map((l) => [String(l.unitId), (l.tenantId as any)?.fullName ?? null]),
    );

    const waterRows = waterReadings.map((r) => {
      const uid = (r.unitId as any)?._id ? String((r.unitId as any)._id) : String(r.unitId);
      return {
        _id:         String(r._id),
        unitNumber:  (r.unitId as any)?.unitNumber ?? "—",
        tenantName:  tenantNameByUnitId.get(uid) ?? null,
        consumption: r.consumption,
        rateUsed:    r.rateUsed,
        amount:      r.amount,
        readingDate: r.readingDate.toISOString(),
        photoUrl:    r.photoUrl ?? null,
      };
    });

    const waterSummary = {
      totalBilled:    waterRows.reduce((s, r) => s + r.amount, 0),
      unitsRead:      waterRows.length,
      avgConsumption: waterRows.length > 0
        ? Math.round(
            (waterRows.reduce((s, r) => s + r.consumption, 0) / waterRows.length) * 10,
          ) / 10
        : 0,
    };

    // ─── 8. Full payment ledger (all time, last 100) ──────────────────────────

    const allLeases = await Lease.find(
      { unitId: { $in: unitIds } },
      { _id: 1, unitId: 1, tenantId: 1 },
    )
      .populate("tenantId", "fullName")
      .lean();

    const allLeaseIds      = allLeases.map((l) => l._id);
    const unitNumberById   = new Map(units.map((u) => [String(u._id), u.unitNumber]));
    const tenantByLeaseId  = new Map(allLeases.map((l) => [String(l._id), (l.tenantId as any)?.fullName ?? null]));
    const unitIdByLeaseId  = new Map(allLeases.map((l) => [String(l._id), String(l.unitId)]));

    const ledgerPayments = await Payment.find({ leaseId: { $in: allLeaseIds } })
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();

    const ledger = ledgerPayments.map((p) => ({
      _id:             String(p._id),
      paymentDate:     p.paymentDate.toISOString(),
      paymentForMonth: p.paymentForMonth.toISOString(),
      tenantName:      tenantByLeaseId.get(String(p.leaseId)) ?? null,
      unitNumber:      unitNumberById.get(unitIdByLeaseId.get(String(p.leaseId)) ?? "") ?? "—",
      amount:          p.amount,
      paymentMethod:   p.paymentMethod,
      transactionRef:  p.transactionRef,
    }));

    return successResponse(
      {
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
        summary,
        rentRoll,
        waterSummary,
        waterReadings: waterRows,
        expenses: expenseRows,
        expenseByCategory,
        ledger,
      },
      "Finance data fetched",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch finance data",
      500,
    );
  }
}
