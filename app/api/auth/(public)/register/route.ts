import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { emailService } from "@/lib/services/email.service";
import { successResponse } from "@/lib/utils/ApiResponse";
import { User } from "@/lib/models/User";
import redis from "@/lib/redis";

// ─── Validation Schema ────────────────────────────────────────────────────────

const registrationSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json();
  const input = validate(registrationSchema, body);

  // Guard against duplicate requests before hitting DB
  const existsKey = `otp:register:exists:${input.email}`;
  const otpKey = `otp:register:${input.phoneNumber}:${input.email}`;

  const [existsLock, otpLock] = await Promise.all([
    redis.get(existsKey),     // "have we seen this email before and it was registered?"
    redis.get(otpKey),       // "has this email already been sent an OTP recently?"
  ]);

  if (existsLock || otpLock) { return successResponse("Check your email for next steps")}

  const existingUser = await User.findOne({ email: input.email })
    .select("fullName")
    .lean();

  if (!existingUser) {
    // New email — generate and send registration OTP
    await authService.handleRegistrationOtp(input);
  } else {
    // Known email — notify without revealing registration status
    await redis.set(existsKey, "1", { EX: 300, NX: true });
    await emailService.sendWarningToExistingUser(
      input.email,
      existingUser.fullName,
    );
  }

  return successResponse("Check your email for next steps");
});
