import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/ApiResponse";

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  fullName:    z.string().min(2),
  email:       z.string().email(),
  phoneNumber: z.string().min(10),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  // Step 1: Validate request body
  const body  = await req.json();
  const input = validate(schema, body);

  // Step 2: Generate OTP and send via SMS and email
  await authService.sendRegistrationOtp(input);

  // Step 3: Return success response
  return successResponse(null, "OTP sent successfully", 200);
});