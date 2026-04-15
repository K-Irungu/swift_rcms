import jwt, { SignOptions } from "jsonwebtoken";
import { User, Role } from "../models/User";
import { Tenant } from "../models/Tenant";
import { ApiError } from "../utils/ApiError";
import { connectDB } from "../db";
import redis, { connectRedis } from "@/lib/redis";
import crypto from "crypto";
import { smsService } from "./sms.service";
import { emailService } from "./email.service";

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: Role;
}

interface LoginInput {
  email: string;
  password: string;
}

function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign(
    { userId, role, email },
    process.env.JWT_SECRET!,
    {
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        "15m") as SignOptions["expiresIn"],
    },
  );

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
      "7d") as SignOptions["expiresIn"],
  });

  return { accessToken, refreshToken };
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export const authService = {
  async register(input: RegisterInput) {
    await connectDB();

    const exists = await User.findOne({ email: input.email });
    if (exists) throw ApiError.conflict("Email already registered");

    const user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.password, // pre-save hook hashes it
      phoneNumber: input.phoneNumber,
      role: input.role,
    });

    // If registering as tenant, create tenant profile
    if (input.role === Role.TENANT) {
      await Tenant.create({
        userId: user._id,
        idNumber: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
      });
    }

    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
    );

    // Store refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken });

    return { user, accessToken, refreshToken };
  },

  async sendRegistrationOtp(input: Omit<RegisterInput, "password" | "role">) {
    await connectRedis();

    const { phoneNumber, email } = input;
    const identifier = phoneNumber;
    const key = `otp:register:${identifier}`;

    // 1. Check existing OTP (rate limit)
    const existing = await redis.get(key);
    if (existing) {
      throw ApiError.badRequest(
        "OTP already sent. Please wait 1 minute and try again.",
      );
    }

    // 2. Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // 3. Store in Redis with TTL (5 minutes)
    await redis.set(
      key,
      JSON.stringify({
        otpHash,
        payload: input,
        attempts: 0,
      }),
      {
        EX: 1 * 60, // 1 minute expiry
      },
    );

    // 4. Send OTP
    await smsService.send(phoneNumber, `Your OTP is ${otp}`);
    await emailService.send(
      email,
      "Your Registration OTP",
      `Your OTP is ${otp}`,
    );

    return { message: "OTP sent successfully" };
  },

  async login(input: LoginInput) {
    await connectDB();

    const user = await User.findOne({ email: input.email }).select(
      "+passwordHash",
    );
    if (!user) throw ApiError.unauthorized("Invalid email or password");
    if (!user.isActive) throw ApiError.unauthorized("Account deactivated");

    const valid = await user.comparePassword(input.password);
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
    );

    await User.findByIdAndUpdate(user._id, { refreshToken });

    return { user, accessToken, refreshToken };
  },

  async refresh(token: string) {
    await connectDB();

    let payload: { userId: string };
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
        userId: string;
      };
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const user = await User.findById(payload.userId).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      throw ApiError.unauthorized("Refresh token mismatch");
    }

    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role,
      user.email,
    );

    await User.findByIdAndUpdate(user._id, { refreshToken });

    return { accessToken, refreshToken };
  },

  async logout(userId: string) {
    await connectDB();
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  },
};
