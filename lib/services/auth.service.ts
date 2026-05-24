import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { connectDB } from "../db";
import redis, { connectRedis } from "@/lib/redis";
import { smsService } from "./sms.service";
import { emailService } from "./email.service";
import { generateOtp, hashOtp } from "@/lib/utils/otp";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RegisterInput {
  email: string;
  phoneNumber: string;
  fullName: string;
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
  async handleRegistrationOtp(input: RegisterInput) {
    const { fullName, email } = input;

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Atomic write — prevents duplicate OTPs from concurrent requests
    const otpKey = `otp:register:${email}`;
    const inserted = await redis.set(
      otpKey,
      JSON.stringify({ otpHash, attempts: 0 }),
      { EX: 300, NX: true },
    );

    if (!inserted) {
      throw ApiError.badRequest("OTP already sent. Please wait and try again.");
    }

    try {
      await emailService.sendOtp(email, otp, fullName);
    } catch {
      await redis.del(otpKey);
      throw ApiError.internal("Failed to send OTP. Please try again.");
    }
  },

  async register(input: RegisterInput) {
    const { email, phoneNumber, fullName } = input;

    // Guard against duplicate requests before hitting DB
    const existsKey = `otp:register:exists:${input.email}`;
    const otpKey = `otp:register:${input.email}`;

    const [existsLock, otpLock] = await Promise.all([
      redis.get(existsKey), // "have we seen this email before and it was registered?"
      redis.get(otpKey), // "has this email already been sent an OTP recently?"
    ]);

    if (existsLock || otpLock) return null;

    const existingUser = await User.findOne({ email: input.email })
      .select("fullName")
      .lean();

    if (!existingUser) {
      await this.handleRegistrationOtp(input);
    } else {
      await redis.set(existsKey, "1", { EX: 300, NX: true });
      try {
        await emailService.sendWarningToExistingUser(
          email,
          existingUser.fullName,
        );
      } catch {
        await redis.del(existsKey);
        throw ApiError.internal("Failed to send email. Please try again.");
      }
    }

    return { email, phoneNumber, fullName };
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
