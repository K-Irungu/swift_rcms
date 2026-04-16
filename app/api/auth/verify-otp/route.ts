import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validate } from "@/lib/middleware/validate";
import { ApiError } from "@/lib/utils/ApiError";
import redis, { connectRedis } from "@/lib/redis";
import { hashOtp } from "@/lib/utils/otp";

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required"),
  mode: z.enum(["register", "login", "reset"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredOtp {
  otpHash: string;
  payload: { fullName: string; email: string; phoneNumber: string };
  attempts: number;
}

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectRedis();

    // Step 1: Validate request body
    const body = await req.json();
    const { otp, phone, email, mode } = validate(schema, body);

    // Step 2: Look up the OTP entry in Redis
    // TODO: key prefix will vary by mode when login/reset flows are added
    const key = `otp:register:${phone}:${email}`;
    const raw = await redis.get(key);

    if (!raw) {
      throw new ApiError(
        400,
        "OTP expired or not found. Please request a new one.",
      );
    }

    const stored = JSON.parse(raw) as StoredOtp;

    // Step 3: Brute force protection — delete key and block after 5 failed attempts
    if (stored.attempts >= 5) {
      await redis.del(key);
      throw new ApiError(400, "Too many attempts. Please request a new OTP.");
    }

    // Step 4: Hash the incoming OTP and compare against the stored hash
    if (stored.otpHash !== hashOtp(otp)) {
      const ttl = await redis.ttl(key);

      await redis.set(
        key,
        JSON.stringify({ ...stored, attempts: stored.attempts + 1 }),
        { EX: ttl > 0 ? ttl : 60 },
      );
      throw new ApiError(400, "Incorrect OTP. Please try again.");
    }
    // Step 5: OTP is valid — delete it so it cannot be reused
    await redis.del(key);

    // Step 6: Store a verified session so the next step can complete registration
    if (mode === "register") {
      await redis.set(
        `verified:register:${phone}:${email}`,
        JSON.stringify({
          phone,
          email: stored.payload.email,
          fullName: stored.payload.fullName,
        }),
        { EX: 600 }, // 10 minutes to complete registration
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    console.error("verify-otp error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
