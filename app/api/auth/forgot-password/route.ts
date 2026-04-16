// app/api/auth/forgot-password/route.ts
import { NextRequest } from "next/server"
import { z } from "zod"
import { asyncHandler } from "@/lib/utils/asyncHandler"
import { validate } from "@/lib/middleware/validate"
import { ApiError } from "@/lib/utils/ApiError"
import { connectDB } from "@/lib/db"
import { connectRedis } from "@/lib/redis"
import redis from "@/lib/redis"
import { User } from "@/lib/models/User"
import { generateOtp, hashOtp } from "@/lib/utils/otp"
import { emailService } from "@/lib/services/email.service"
import { successResponse } from "@/lib/utils/ApiResponse"

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Valid email is required"),
})

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectDB()
  await connectRedis()

  // Step 1: Validate request body
  const body        = await req.json()
  const { email }   = validate(schema, body)

  // Step 2: Check the email exists in the database
  const user = await User.findOne({ email })
  if (!user) {
    // Return success anyway to prevent email enumeration attacks
    return successResponse(null, "If that email is registered, an OTP has been sent.")
  }

  const key = `otp:reset:${email}`

  // Step 3: Check for an existing OTP to enforce rate limiting
  const existing = await redis.get(key)
  if (existing) {
    throw ApiError.badRequest("OTP already sent. Please wait 5 minutes and try again.")
  }

  // Step 4: Generate OTP and hash it before storing
  const otp     = generateOtp()
  const otpHash = hashOtp(otp)

  // Step 5: Store hashed OTP in Redis with a 5 minute TTL
  await redis.set(
    key,
    JSON.stringify({ otpHash, attempts: 0, userId: user._id.toString() }),
    { EX: 300 },
  )

  // Step 6: Send OTP to the user's email
  await emailService.sendOtp(email, otp)

  return successResponse(null, "If that email is registered, an OTP has been sent.")
})