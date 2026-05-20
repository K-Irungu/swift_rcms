// app/api/auth/resend-otp/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { ApiError } from "@/lib/utils/ApiError";
import redis, { connectRedis } from "@/lib/redis";
import { generateOtp, hashOtp } from "@/lib/utils/otp";
import { smsService } from "@/lib/services/sms.service";
import { emailService } from "@/lib/services/email.service";
import { successResponse } from "@/lib/utils/ApiResponse";

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required"),
  mode: z.enum(["register", "login", "reset"]),
});

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectRedis();

  // Step 1: Validate request body
  const body = await req.json();
  const { phone, email, mode } = validate(schema, body);

  // Step 2: Look up existing OTP entry and retrieve the original payload
  // TODO: key prefix will vary by mode when login/reset flows are added
  const key = `otp:register:${phone}:${email}`;
  const raw = await redis.get(key);

  // We need the original payload (fullName) to re-store with the new OTP
  const existing = raw ? JSON.parse(raw) : null;

  if (!existing) {
    throw new ApiError(
      400,
      "No registration session found. Please register again.",
    );
  }

  // Step 3: Delete the existing OTP entry
  await redis.del(key);

  // Step 4: Generate a new OTP and hash it
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  // Step 5: Store the new OTP in Redis with a fresh 5 minute TTL
  await redis.set(
    key,
    JSON.stringify({ otpHash, payload: existing.payload, attempts: 0 }),
    { EX: 300 },
  );

  // Step 6: Dispatch the new OTP via SMS and email
  await smsService.send(
    phone,
    `Your Swift RCMS OTP is ${otp}. It expires in 5 minutes.`,
  );
  await emailService.sendOtp(email, otp);

  return successResponse(null, "OTP resent successfully");
});
