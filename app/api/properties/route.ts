import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Unit } from "@/lib/models/Unit";
import { Lease } from "@/lib/models/Lease";
import { Invoice } from "@/lib/models/Invoice";
import { Payment } from "@/lib/models/Payment";
import { IUnitType } from "@/lib/models/Property";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [properties, unitStats, revenueStats, arrearsStats, collectionStats] =
      await Promise.all([
        Property.find().sort({ createdAt: -1 }).lean(),

        // Total and occupied unit counts per property
        Unit.aggregate([
          {
            $group: {
              _id: "$propertyId",
              total: { $sum: 1 },
              occupied: {
                $sum: { $cond: [{ $eq: ["$occupancyStatus", "OCCUPIED"] }, 1, 0] },
              },
            },
          },
        ]),

        // Expected monthly revenue = sum of monthlyRent on ACTIVE leases per property
        Lease.aggregate([
          { $match: { status: "ACTIVE" } },
          {
            $lookup: {
              from: "units",
              localField: "unitId",
              foreignField: "_id",
              as: "unit",
            },
          },
          { $unwind: "$unit" },
          {
            $group: {
              _id: "$unit.propertyId",
              monthlyRevenue: { $sum: "$monthlyRent" },
            },
          },
        ]),

        // Arrears = sum of OVERDUE invoice amounts per property
        Invoice.aggregate([
          { $match: { status: "OVERDUE" } },
          {
            $lookup: {
              from: "leases",
              localField: "leaseId",
              foreignField: "_id",
              as: "lease",
            },
          },
          { $unwind: "$lease" },
          {
            $lookup: {
              from: "units",
              localField: "lease.unitId",
              foreignField: "_id",
              as: "unit",
            },
          },
          { $unwind: "$unit" },
          {
            $group: {
              _id: "$unit.propertyId",
              arrears: { $sum: "$amount" },
            },
          },
        ]),

        // Collected this month = sum of payments where paymentForMonth is current month
        Payment.aggregate([
          { $match: { paymentForMonth: { $gte: startOfMonth, $lte: endOfMonth } } },
          {
            $lookup: {
              from: "leases",
              localField: "leaseId",
              foreignField: "_id",
              as: "lease",
            },
          },
          { $unwind: "$lease" },
          {
            $lookup: {
              from: "units",
              localField: "lease.unitId",
              foreignField: "_id",
              as: "unit",
            },
          },
          { $unwind: "$unit" },
          {
            $group: {
              _id: "$unit.propertyId",
              collected: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    const unitMap = new Map(
      unitStats.map((u: { _id: string; total: number; occupied: number }) => [
        u._id.toString(),
        { total: u.total, occupied: u.occupied },
      ])
    );
    const revenueMap = new Map(
      revenueStats.map((r: { _id: string; monthlyRevenue: number }) => [
        r._id.toString(),
        r.monthlyRevenue,
      ])
    );
    const arrearsMap = new Map(
      arrearsStats.map((a: { _id: string; arrears: number }) => [
        a._id.toString(),
        a.arrears,
      ])
    );
    const collectionMap = new Map(
      collectionStats.map((c: { _id: string; collected: number }) => [
        c._id.toString(),
        c.collected,
      ])
    );

    const enriched = properties.map((p) => {
      const id = (p._id as { toString(): string }).toString();
      const units = unitMap.get(id) ?? { total: 0, occupied: 0 };
      const monthlyRevenue = revenueMap.get(id) ?? 0;
      return {
        ...p,
        stats: {
          totalUnits: units.total,
          occupiedUnits: units.occupied,
          vacantUnits: units.total - units.occupied,
          monthlyRevenue,
          collectedThisMonth: collectionMap.get(id) ?? 0,
          arrears: arrearsMap.get(id) ?? 0,
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

    const step1 = JSON.parse(formData.get("step1") as string);
    const step2 = JSON.parse(formData.get("step2") as string);
    const step3 = JSON.parse(formData.get("step3") as string);
    const step4 = JSON.parse(formData.get("step4") as string);

    let coverPhotoUrl = "";

    const file = formData.get("coverPhoto") as File | null;

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name}`;
      const filepath = path.join(process.cwd(), "public/uploads", filename);
      await fs.writeFile(filepath, buffer);
      coverPhotoUrl = `/uploads/${filename}`;
    }

    const property = await Property.create({
      propertyName: step1.propertyName,
      slug: generateSlug(step1.propertyName),
      description: step1.description,
      coverPhotoUrl,

      location: {
        physicalAddress: step2.physicalAddress,
        country: step2.country,
        county: step2.county,
        city: step2.city,
        coordinates: step2.coordinates,
      },

      unitTypes: step3.unitTypes.map((u: IUnitType) => ({
        name: u.name,
        count: Number(u.count),
        rentAmount: Number(u.rentAmount),
        depositAmount: u.depositAmount ? Number(u.depositAmount) : undefined,
      })),

      billing: {
        rentDueDay: Number(step4.rentDueDay),
        paymentMethods: step4.paymentMethods,
      },
    });

    return NextResponse.json({ success: true, propertyId: property._id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create property" },
      { status: 500 }
    );
  }
}
