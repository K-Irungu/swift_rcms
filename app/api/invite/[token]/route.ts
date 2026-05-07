import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ManagerInvite } from "@/lib/models/ManagerInvite";
import "@/lib/models/User";
import Property from "@/lib/models/Property";
import { NotificationType } from "@/lib/models/Notificaiton";
import { getCurrentUser } from "@/lib/utils/auth";
import { emailService } from "@/lib/services/email.service";
import { smsService } from "@/lib/services/sms.service";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import inviteEmitter from "@/lib/inviteEmitter";
import { createNotification } from "@/lib/utils/createNotification";

// GET /api/invite/[token] — fetch invite details for the acceptance page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    await connectDB();

    const invite = await ManagerInvite.findOne({ token })
      .populate("managerId", "fullName email")
      .populate("landlordId", "fullName email")
      .populate("propertyId", "propertyName slug");

    if (!invite) return errorResponse("Invitation not found", 404);
    if (invite.status === "ACCEPTED") return errorResponse("This invitation has already been accepted", 410);
    if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
      return errorResponse("This invitation has expired", 410);
    }

    return successResponse({
      propertyName: (invite.propertyId as any).propertyName,
      landlordName: (invite.landlordId as any).fullName,
      managerName:  (invite.managerId as any).fullName,
      managerEmail: (invite.managerId as any).email,
      expiresAt:    invite.expiresAt,
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to load invitation", 500);
  }
}

// POST /api/invite/[token] — accept the invite
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("You must be logged in to accept this invitation", 401);

    const { token } = await params;
    await connectDB();

    const invite = await ManagerInvite.findOne({ token })
      .populate("managerId", "fullName email phoneNumber")
      .populate("landlordId", "fullName email phoneNumber")
      .populate("propertyId", "propertyName slug ownerId");

    if (!invite) return errorResponse("Invitation not found", 404);
    if (invite.status === "ACCEPTED") return errorResponse("This invitation has already been accepted", 410);
    if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
      return errorResponse("This invitation has expired", 410);
    }

    // Ensure the logged-in user is the intended recipient
    if (invite.managerId._id.toString() !== authUser.userId) {
      return errorResponse("This invitation was not sent to your account", 403);
    }

    // Assign manager to property
    await Property.findByIdAndUpdate((invite.propertyId as any)._id, {
      $set: { propertyManager: invite.managerId._id },
    });

    invite.status = "ACCEPTED";
    await invite.save();

    const manager  = invite.managerId  as any;
    const landlord = invite.landlordId as any;
    const property = invite.propertyId as any;

    inviteEmitter.emit(`invite:accepted:${property._id}`, {
      managerId:   manager._id.toString(),
      managerName: manager.fullName,
    });

    // ── Notify manager (best-effort) ──
    emailService
      .sendNotification(
        manager.email,
        `You are now managing ${property.propertyName}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2>Assignment Confirmed</h2>
            <p>Hi ${manager.fullName},</p>
            <p>
              You have successfully accepted the invitation to manage
              <strong>${property.propertyName}</strong> on Swift RCMS.
            </p>
            <p>Head to your dashboard to get started.</p>
          </div>
        `,
      )
      .catch((err) => console.error("Manager confirmation email failed:", err));

    if (manager.phoneNumber) {
      smsService
        .send(
          manager.phoneNumber,
          `Hi ${manager.fullName}, you are now managing ${property.propertyName} on Swift RCMS. Log in to your dashboard to get started.`,
        )
        .catch((err) => console.error("Manager confirmation SMS failed:", err));
    }

    createNotification({
      userId:  manager._id.toString(),
      type:    NotificationType.MANAGER_ASSIGNED,
      title:   "Assignment Confirmed",
      message: `You are now managing ${property.propertyName}.`,
    }).catch((err) => console.error("Manager in-app notification failed:", err));

    // ── Notify landlord (best-effort) ──
    emailService
      .sendNotification(
        landlord.email,
        `${manager.fullName} has accepted your invitation`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2>Invitation Accepted</h2>
            <p>Hi ${landlord.fullName},</p>
            <p>
              <strong>${manager.fullName}</strong> has accepted your invitation and is now
              managing <strong>${property.propertyName}</strong> on Swift RCMS.
            </p>
          </div>
        `,
      )
      .catch((err) => console.error("Landlord confirmation email failed:", err));

    if (landlord.phoneNumber) {
      smsService
        .send(
          landlord.phoneNumber,
          `Hi ${landlord.fullName}, ${manager.fullName} has accepted your invitation and is now managing ${property.propertyName} on Swift RCMS.`,
        )
        .catch((err) => console.error("Landlord confirmation SMS failed:", err));
    }

    createNotification({
      userId:  landlord._id.toString(),
      type:    NotificationType.MANAGER_ASSIGNED,
      title:   "Invitation Accepted",
      message: `${manager.fullName} has accepted your invitation and is now managing ${property.propertyName}.`,
    }).catch((err) => console.error("Landlord in-app notification failed:", err));

    return successResponse(
      { propertyName: property.propertyName },
      "Invitation accepted successfully",
    );
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to accept invitation", 500);
  }
}
