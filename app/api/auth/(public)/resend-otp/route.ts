// app/api/auth/resend-otp/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { ApiError } from "@/lib/utils/ApiError";
import { authService } from "@/lib/services/auth.service";
import { errorResponse, successResponse } from "@/lib/utils/ApiResponse";
import {
  getPendingRegistrationCookie,
  clearPendingRegistrationCookie, // 1. Import your cookie clearing utility
} from "@/lib/utils/cookies";

// ─── Validation Schema ────────────────────────────────────────────────────────

const resendOtpSchema = z.object({
  mode: z.enum(["register", "reset"]),
});

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  // Step 1: Validate the request body mode
  const body = await req.json().catch(() => {
    throw ApiError.badRequest("Invalid or missing request body");
  });
  const { mode } = validate(resendOtpSchema, body);

  // Step 2: Grab the encrypted cookie payload
  const identityPayload = await getPendingRegistrationCookie();

  if (!identityPayload) {
    throw ApiError.badRequest("Your session has expired. Please start over.");
  }

  // Step 3: Trigger the service layer
  const result = await authService.resendOtp({
    email: identityPayload.email,
    fullName: identityPayload.fullName,
    mode,
  });

  // ─── Crucial Sync Check ─────────────────────────────────────────────────────
  // If your authService returns a specific signal indicating that the session 
  // is totally dead in Redis (e.g., result.expired, or result is null)
  if (!result || result.expired) {
    // Construct an error response instance
    const res = errorResponse("Your registration session has expired on our servers. Please sign up again.", 400);
    
    // Mutate the error response to append the deletion headers!
    await clearPendingRegistrationCookie(res);
    
    throw errorResponse;
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Step 4: Construct the normal generic success response payload
  const response = successResponse(
    { retryAfter: result.retryAfter ?? null },
    "A fresh verification code has been dispatched to your email.",
  );

  return response;
});