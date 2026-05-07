import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { User, Role } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";
import { createNotification } from "@/lib/utils/createNotification";
import { NotificationType } from "@/lib/models/Notificaiton";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const { managerId } = await req.json();

    await connectDB();

    const property = await Property.findOne({ slug: id });
    if (!property) return errorResponse("Property not found", 404);

    if (property.ownerId.toString() !== authUser.userId) {
      return errorResponse("Forbidden", 403);
    }

    // Removal
    if (managerId === null) {
      const removedManagerId = property.propertyManager?.toString();

      property.propertyManager = null;
      await property.save();

      if (removedManagerId) {
        const removedManager = await User.findById(removedManagerId).select("_id fullName");
        if (removedManager) {
          createNotification({
            userId:  removedManager._id.toString(),
            type:    NotificationType.MANAGER_REMOVED,
            title:   "Property Assignment Ended",
            message: `You have been removed as the property manager for ${property.propertyName} by ${authUser.fullName}.`,
          }).catch((err) => console.error("Manager removal notification failed:", err));
        }
      }

      return successResponse(null, "Manager removed");
    }

    // Assignment (direct — invite flow is handled separately)
    const manager = await User.findOne({
      _id: managerId,
      role: Role.PROPERTY_MANAGER,
      isActive: true,
    }).select("_id fullName email");

    if (!manager) return errorResponse("User not found or is not a property manager", 400);

    property.propertyManager = manager._id;
    await property.save();

    return successResponse({ propertyManager: manager });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to update manager", 500);
  }
}
