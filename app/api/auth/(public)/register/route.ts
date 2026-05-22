import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/ApiResponse";
import { connectDB } from "../../../../../lib/db";
import { emailService } from "../../../../../lib/services/email.service";
import { User } from "@/lib/models/User";

// ─── Validation Schema ────────────────────────────────────────────────────────

const validationSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectDB();
  
  // Step 1: Validate request body
  const body = await req.json();
  const input = validate(validationSchema, body);

  // Step 2: Check if email existsin DB
  const existingUser = await User.findOne({ email: input.email })
    .select("fullName")
    .lean();

  // Step 3: If email doesn't exist, send registration OTP, otherwise send "account exists" email to existing user email
  if (!existingUser) {
    await authService.handleRegistrationOtp(input);
  } else {
    await emailService.sendWarningToExistingUser(
      input.email,
      existingUser.fullName,
    );
  }

  // Step 4: Return generic success response in both cases to prevent email enumeration
  return successResponse("Check your email for next steps");
});
