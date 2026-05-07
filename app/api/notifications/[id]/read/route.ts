import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/lib/models/Notificaiton";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

// PATCH /api/notifications/[id]/read — mark a single notification as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: authUser.userId },
      { isRead: true },
    );

    if (!notification) return errorResponse("Notification not found", 404);

    return successResponse(null, "Notification marked as read");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to mark notification as read", 500);
  }
}
