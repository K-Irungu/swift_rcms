import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/ApiResponse";
import { ApiError } from "@/lib/utils/ApiError";
import { setPendingRegistrationCookie } from "@/lib/utils/cookies";

// ─── Validation Schema ────────────────────────────────────────────────────────

const registrationSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  // Step 1: Validate request body
  const body = await req.json().catch(() => {
    throw ApiError.badRequest("Invalid request body");
  });
  const input = validate(registrationSchema, body);

  // Step 2: Process registration and send OTP email
  const pending = await authService.register(input);

  // Step 3: Return a standardized generic success response
  const response = successResponse(null, "Check your email for next steps");

  if (pending) {
    await setPendingRegistrationCookie(response, {
      email: pending.email,
      fullName: pending.fullName,
      phoneNumber: pending.phoneNumber,
    });
  }

  return response;
});
