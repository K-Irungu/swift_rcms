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

    if (tenant.onboardingStatus !== OnboardingStatus.DOCUMENTS_SUBMITTED)
      return errorResponse("KYC documents must be submitted before review", 400);

    const property = await Property.findById(tenant.propertyId, { ownerId: 1 });
    if (!property) return errorResponse("Property not found", 404);
    if (String(property.ownerId) !== authUser.userId)
      return errorResponse("Only the property owner can approve KYC", 403);

    const { decision, rejectionReason } = await req.json();

    if (!["approve", "reject"].includes(decision))
      return errorResponse("decision must be 'approve' or 'reject'", 400);

    if (decision === "reject" && !rejectionReason?.trim())
      return errorResponse("rejectionReason is required when rejecting", 400);

    const newStatus = decision === "approve"
      ? OnboardingStatus.KYC_APPROVED
      : OnboardingStatus.KYC_REJECTED;

    await Tenant.findByIdAndUpdate(id, {
      onboardingStatus: newStatus,
      "kyc.reviewedAt":      new Date(),
      ...(decision === "reject" ? { "kyc.rejectionReason": rejectionReason.trim() } : { "kyc.rejectionReason": undefined }),
    });

    const message = decision === "approve"
      ? "KYC approved — tenant can now sign the lease"
      : "KYC rejected — tenant must resubmit documents";

    return successResponse({ status: newStatus }, message);
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "KYC review failed", 500);
  }
}
