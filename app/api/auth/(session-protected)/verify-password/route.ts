import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse("Unauthorized", 401);

    const { password } = await req.json();
    if (!password) return errorResponse("Password is required", 400);

    await connectDB();

    const user = await User.findById(authUser.userId).select("+passwordHash");
    if (!user) return errorResponse("User not found", 404);

    const valid = await user.comparePassword(password);
    if (!valid) return errorResponse("Incorrect password", 401);

    return successResponse({ verified: true }, "Password verified");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to verify password", 500);
  }
}
