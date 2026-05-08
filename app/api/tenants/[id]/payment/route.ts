import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Tenant, OnboardingStatus } from "@/lib/models/Tenant";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    await connectDB();

    const tenant = await Tenant.findById(id);
    if (!tenant) return errorResponse("Tenant not found", 404);

    if (tenant.onboardingStatus !== OnboardingStatus.LEASE_SIGNED)
      return errorResponse("Lease must be signed before recording payment", 400);

    if (!tenant.leaseRecord)
      return errorResponse("Lease record not found", 400);

    const property = await Property.findById(tenant.propertyId, { ownerId: 1, propertyManager: 1 });
    if (!property) return errorResponse("Property not found", 404);
    const isOwner   = String(property.ownerId) === authUser.userId;
    const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
    if (!isOwner && !isManager) return errorResponse("Forbidden", 403);

    const body = await req.json();
    const {
      depositReceived, depositReference,
      firstRentReceived, firstRentReference,
    } = body;

    const dep  = Number(depositReceived  ?? tenant.moveInPayment?.depositReceived  ?? 0);
    const rent = Number(firstRentReceived ?? tenant.moveInPayment?.firstRentReceived ?? 0);

    if (isNaN(dep)  || dep  < 0) return errorResponse("depositReceived must be ≥ 0", 400);
    if (isNaN(rent) || rent < 0) return errorResponse("firstRentReceived must be ≥ 0", 400);

    const depExpected  = tenant.leaseRecord.depositAmount;
    const rentExpected = tenant.leaseRecord.rentAmount;

    const fullyPaid = dep >= depExpected && rent >= rentExpected;

    const payment = {
      depositExpected:     depExpected,
      depositReceived:     dep,
      ...(depositReference  ? { depositReference }               : {}),
      ...(dep > 0           ? { depositReceivedAt:  new Date() } : {}),
      firstRentExpected:   rentExpected,
      firstRentReceived:   rent,
      ...(firstRentReference ? { firstRentReference }             : {}),
      ...(rent > 0           ? { firstRentReceivedAt: new Date() } : {}),
    };

    await Tenant.findByIdAndUpdate(id, {
      moveInPayment: payment,
      ...(fullyPaid ? { onboardingStatus: OnboardingStatus.ACTIVE } : {}),
    });

    return successResponse(
      { payment, activated: fullyPaid },
      fullyPaid
        ? "Payment confirmed — tenant is now active"
        : "Payment recorded — outstanding balance remains",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "Failed to record payment", 500);
  }
}
