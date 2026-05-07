import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { User, Role } from "@/lib/models/User";
import { ManagerInvite } from "@/lib/models/ManagerInvite";
import { Notification, NotificationType } from "@/lib/models/Notificaiton";
import { getCurrentUser } from "@/lib/utils/auth";
import { emailService } from "@/lib/services/email.service";
import { smsService } from "@/lib/services/sms.service";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

// GET /api/properties/[id]/manager/invite — fetch pending invite for this property
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) return errorResponse("Property not found", 404);
    if (property.ownerId.toString() !== authUser.userId) return errorResponse("Forbidden", 403);

    const invite = await ManagerInvite.findOne({
      propertyId: property._id,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    }).populate("managerId", "fullName email");

    if (!invite) return successResponse(null);

    return successResponse({
      managerName:  (invite.managerId as any).fullName,
      managerEmail: (invite.managerId as any).email,
      expiresAt:    invite.expiresAt,
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch invitation", 500);
  }
}

// DELETE /api/properties/[id]/manager/invite — cancel pending invite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) return errorResponse("Property not found", 404);
    if (property.ownerId.toString() !== authUser.userId) return errorResponse("Forbidden", 403);

    const invite = await ManagerInvite.findOneAndUpdate(
      { propertyId: property._id, status: "PENDING" },
      { status: "EXPIRED" },
    );

    if (!invite) return errorResponse("No pending invitation found", 404);

    return successResponse(null, "Invitation cancelled");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to cancel invitation", 500);
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://swiftrcms.app";
const INVITE_TTL_HOURS = parseInt(process.env.INVITE_TTL_HOURS || "48", 10);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const { managerId } = await req.json();
    if (!managerId) return errorResponse("managerId is required", 400);

    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) return errorResponse("Property not found", 404);

    if (property.ownerId.toString() !== authUser.userId) {
      return errorResponse("Forbidden", 403);
    }

    const manager = await User.findOne({
      _id: managerId,
      role: Role.PROPERTY_MANAGER,
      isActive: true,
    }).select("_id fullName email phoneNumber");

    if (!manager) return errorResponse("User not found or is not a property manager", 400);

    // Cancel any existing pending invite for this property+manager pair
    await ManagerInvite.updateMany(
      { propertyId: property._id, managerId: manager._id, status: "PENDING" },
      { status: "EXPIRED" },
    );

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    await ManagerInvite.create({
      propertyId: property._id,
      managerId:  manager._id,
      landlordId: authUser.userId,
      token,
      expiresAt,
    });

    const acceptUrl = `${APP_URL}/invite/${token}`;

    // ── Email (hard requirement — clean up invite if it fails) ──
    try {
      await emailService.sendNotification(
        manager.email,
        `You've been invited to manage ${property.propertyName}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2>Property Manager Invitation</h2>
            <p>Hi ${manager.fullName},</p>
            <p>
              <strong>${authUser.fullName}</strong> has invited you to manage
              <strong>${property.propertyName}</strong> on Swift RCMS.
            </p>
            <p>This invitation expires in ${INVITE_TTL_HOURS} hours.</p>
            <a
              href="${acceptUrl}"
              style="display:inline-block;margin-top:16px;padding:10px 24px;background:#2D64C8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600"
            >
              Accept Invitation
            </a>
            <p style="margin-top:24px;font-size:12px;color:#888">
              If you did not expect this invitation, you can ignore this email.
            </p>
          </div>
        `,
      );
    } catch (emailErr) {
      console.error("Email failed:", emailErr);
      await ManagerInvite.deleteOne({ token });
      return errorResponse("Failed to send invitation email. Please try again.", 502);
    }

    // ── SMS (best-effort, does not block invite) ──
    if (manager.phoneNumber) {
      smsService
        .send(
          manager.phoneNumber,
          `Hi ${manager.fullName}, ${authUser.fullName} has invited you to manage ${property.propertyName} on Swift RCMS. Accept here: ${acceptUrl}`,
        )
        .catch((err) => console.error("SMS failed:", err));
    }

    // ── In-app notification (best-effort) ──
    Notification.create({
      userId:  manager._id,
      type:    NotificationType.MANAGER_INVITE,
      title:   "Property Manager Invitation",
      message: `${authUser.fullName} has invited you to manage ${property.propertyName}. Tap to review and accept.`,
    }).catch((err) => console.error("In-app notification failed:", err));

    return successResponse({ token, expiresAt }, "Invitation sent successfully", 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to send invitation", 500);
  }
}
