import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/ApiResponse";
import { emailService } from "../../../../../lib/services/email.service";
import { User } from "@/lib/models/User";

import redis, { connectRedis } from "@/lib/redis";

// ─── Validation Schema ────────────────────────────────────────────────────────

const validationSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {

      await connectRedis();


  const body = await req.json();
  const input = validate(validationSchema, body);

  // Check Redis first — before touching DB on either path
  const existsKey = `otp:register:exists:${input.email}`;
  const otpKey = `otp:register:${input.phoneNumber}:${input.email}`;

  // Fast Redis check — stops repeat requests before DB query
  const [existsLock, otpLock] = await Promise.all([
    redis.get(existsKey), // ← "have we seen this email before and it was registered?"
    redis.get(otpKey), // ← "has this email already been sent an OTP recently?"
  ]);

  if (existsLock || otpLock) {
    return successResponse("Check your email for next steps");
  }

  // Now hit the DB
  const existingUser = await User.findOne({ email: input.email })
    .select("fullName")
    .lean();

  if (!existingUser) {
    await authService.handleRegistrationOtp(input);
  } else {
    // Set Redis key atomically — rate limits repeat requests
    await redis.set(existsKey, "1", { EX: 300, NX: true });
    await emailService.sendWarningToExistingUser(
      input.email,
      existingUser.fullName,
    );
  }

  return successResponse("Check your email for next steps");
});
