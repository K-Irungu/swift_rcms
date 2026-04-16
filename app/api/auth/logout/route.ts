// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { asyncHandler } from "@/lib/utils/asyncHandler"
import { authenticate } from "@/lib/middleware/authenticate"
import { authService } from "@/lib/services/auth.service"
import { clearAuthCookies } from "@/lib/utils/cookies"

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  // Step 1: Decode the access token and get the userId
  const user = authenticate(req)

  // Step 2: Invalidate the refresh token in the database
  await authService.logout(user.userId)

  // Step 3: Clear auth cookies from the browser
  const response = NextResponse.json({ success: true, message: "Logged out successfully" })
  clearAuthCookies(response)

  return response
})