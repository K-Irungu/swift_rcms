import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { connectDB } from "../db";
import redis, { connectRedis } from "@/lib/redis";
import { smsService } from "./sms.service";
import { emailService } from "./email.service";
import { generateOtp, hashOtp } from "@/lib/utils/otp";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RegisterOtpInput {
  fullName: string;
  email: string;
  phoneNumber: string;
}

interface LoginInput {
  email: string;
  password: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Signs and returns a short-lived access token and a long-lived refresh token
export const generateTokens = (
  userId: string,
  role: string,
  email: string,
  fullName: string,
) => {
  const accessToken = jwt.sign(
    { userId, role, email, fullName },
    process.env.JWT_SECRET!,
    {
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        "15m") as SignOptions["expiresIn"],
    },
  );

  const refreshToken = jwt.sign(
    { userId, role, email, fullName },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
        "7d") as SignOptions["expiresIn"],
    },
  );

  return { accessToken, refreshToken };
};

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  async handleRegistrationOtp(input: RegisterOtpInput) {

    // Step 1: Capture fullname, email and phoneNumber from input
    const { fullName, email, phoneNumber } = input;

    // Step 2: Generate otp and hash it
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Step 3: Atomic check + write in redis
    const otpKey = `otp:register:${phoneNumber}:${email}`;
    const inserted = await redis.set(
      otpKey,
      JSON.stringify({ otpHash, payload: input, attempts: 0 }),
      { EX: 300, NX: true },
    );

    // Step 4: If null — key already existed, it snuck in between our route check and now
    if (!inserted) { throw ApiError.badRequest("OTP already sent. Please wait and try again.") }

    
    // QUEUE
    // Step 5: Send email only after otp is ready for verification
    await emailService.sendOtp(email, otp, fullName);
  },

  async login(input: LoginInput) {


    // Step 1: Find user and verify account status
    const user = await User.findOne({ email: input.email }).select(
      "+passwordHash",
    );
    if (!user) throw ApiError.unauthorized("Invalid email or password");
    if (!user.isActive) throw ApiError.unauthorized("Account deactivated");

    // Step 2: Verify password against stored hash
    const valid = await user.comparePassword(input.password);
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    // Step 3: Issue tokens and persist refresh token
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
      user.fullName,
    );

    await User.findByIdAndUpdate(user._id, { refreshToken });

    return { user, accessToken, refreshToken };
  },

  async refresh(token: string) {


    // Step 1: Verify and decode the refresh token
    let payload: { userId: string };
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
        userId: string;
      };
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Step 2: Ensure token matches the one stored on the user (prevents reuse after logout)
    const user = await User.findById(payload.userId).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      throw ApiError.unauthorized("Refresh token mismatch");
    }

    // Step 3: Issue new tokens and persist the new refresh token
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
      user.fullName,
    );

    await User.findByIdAndUpdate(user._id, { refreshToken });

    return { accessToken, refreshToken };
  },

  // Invalidates the refresh token, preventing future token renewals
  async logout(userId: string) {

    await User.findByIdAndUpdate(userId, { refreshToken: null });
  },
};
