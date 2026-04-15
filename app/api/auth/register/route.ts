import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/ApiResponse";

const requestOtpSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
});

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json();
  const input = validate(requestOtpSchema, body);
  await authService.sendRegistrationOtp(input);
  return successResponse(null, "OTP sent successfully", 200);
});