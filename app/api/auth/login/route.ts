import { NextRequest } from "next/server";
import { z } from "zod";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { validate } from "@/lib/middleware/validate";
import { authService } from "@/lib/services/auth.service";
import { setAuthCookies } from "@/lib/utils/cookies";
import { successResponse } from "@/lib/utils/ApiResponse";

// ─── Validation Schema ────────────────────────────────────────────────────────

const validationSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  // Step 1: Validate request body
  const body = await req.json();
  const input = validate(validationSchema, body);

  // Step 2: Verify credentials and issue tokens
  const { user, accessToken, refreshToken } = await authService.login(input);

  // Step 3: Return user details in a standardized success response
  const response = successResponse(
    {
      user: {
        name: user.fullName,
        role: user.role,
      },
    },
    "Login successful",
  );

  // Step 4: Set httpOnly cookies for access and refresh tokens to maintain session on the client
  setAuthCookies(response, accessToken, refreshToken);

  return response;
});
