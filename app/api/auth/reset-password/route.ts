// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validate } from "@/lib/middleware/validate";
import { ApiError } from "@/lib/utils/ApiError";
import redis, { connectRedis } from "@/lib/redis";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/ApiResponse";

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Valid email is required"),
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectRedis();
  await connectDB();

  // Step 1: Validate request body
  const body = await req.json();
  const { password, email } = validate(schema, body);

  // Step 2: Look up the verified reset session created after OTP verification
  const verifiedKey = `verified:reset:${email}`;
  const raw = await redis.get(verifiedKey);

  if (!raw) {
    throw new ApiError(400, "Reset session expired. Please request a new OTP.");
  }

  const verified = JSON.parse(raw) as { email: string; userId: string };

  // Step 3: Find the user
  const user = await User.findById(verified.userId);
  if (!user) throw new ApiError(404, "User not found.");

  // Step 4: Update the password — pre-save hook will hash it
  user.passwordHash = password;
  await user.save();

  // Step 5: Invalidate the refresh token to force re-login with new password
  await User.findByIdAndUpdate(verified.userId, { refreshToken: null });

  // Step 6: Clean up the verified reset session from Redis
  await redis.del(verifiedKey);

  return successResponse(null, "Password reset successfully. Please log in.");
});
