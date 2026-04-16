// app/api/auth/set-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validate } from "@/lib/middleware/validate";
import { ApiError } from "@/lib/utils/ApiError";
import redis, { connectRedis } from "@/lib/redis";
import { connectDB } from "@/lib/db";
import { User, Role } from "@/lib/models/User";
import { Landlord } from "@/lib/models/Landlord";
import { generateTokens } from "@/lib/services/auth.service";

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required"),
});

// ─── POST /api/auth/set-password ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectRedis();
    await connectDB();

    // Step 1: Validate request body
    const body = await req.json();
    const { password, phone, email } = validate(schema, body);

    // Step 2: Look up the verified session created after OTP verification
    const verifiedKey = `verified:register:${phone}:${email}`;
    const raw = await redis.get(verifiedKey);

    if (!raw) {
      throw new ApiError(
        400,
        "Verification session expired. Please register again.",
      );
    }

    const verified = JSON.parse(raw) as {
      phone: string;
      email: string;
      fullName: string;
    };

    // Step 3: Guard against the email being registered between OTP and set-password
    const exists = await User.findOne({ email: verified.email });
    if (exists) throw new ApiError(409, "Email already registered.");

    // Step 4: Create the user as a Landlord
    const user = await User.create({
      fullName: verified.fullName,
      email: verified.email,
      passwordHash: password,
      phoneNumber: verified.phone,
      role: Role.LANDLORD,
    });

    // Step 5: Create landlord profile linked to the new user
    await Landlord.create({ userId: user._id });

    // Step 6: Issue access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
    );

    // Step 7: Persist refresh token on the user document
    await User.findByIdAndUpdate(user._id, { refreshToken });

    // Step 8: Clean up the verified session from Redis
    await redis.del(verifiedKey);

    return NextResponse.json({ success: true, accessToken, refreshToken });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    console.error("set-password error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
