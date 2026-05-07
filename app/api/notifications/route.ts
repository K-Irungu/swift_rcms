import { connectDB } from "@/lib/db";
import { Notification } from "@/lib/models/Notificaiton";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

// GET /api/notifications — fetch current user's 20 most recent notifications
export async function GET() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    await connectDB();

    const notifications = await Notification.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return successResponse(notifications);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch notifications", 500);
  }
}

// PATCH /api/notifications — mark all notifications as read
export async function PATCH() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    await connectDB();

    await Notification.updateMany(
      { userId: authUser.userId, isRead: false },
      { isRead: true },
    );

    return successResponse(null, "All notifications marked as read");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to mark notifications as read", 500);
  }
}
