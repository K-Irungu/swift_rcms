import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authService } from "@/lib/services/auth.service";
import {
  clearAuthCookies,
  setAuthCookies,
  setLastActivityCookie,
} from "@/lib/utils/cookies";
import { errorResponse, successResponse } from "@/lib/utils/ApiResponse";

const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS) || 15 * 60 * 1000;

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!);

function isIdleExpired(lastActivity?: string) {
  const lastActivityTime = Number(lastActivity);

  return !lastActivityTime || Date.now() - lastActivityTime > IDLE_TIMEOUT_MS;
}

async function hasValidAccessToken(accessToken?: string) {
  if (!accessToken) return false;

  try {
    await jwtVerify(accessToken, accessSecret);
    return true;
  } catch {
    return false;
  }
}

function unauthorized(message: string) {
  const response = errorResponse(message, 401);
  clearAuthCookies(response);
  return response;
}

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const lastActivity = req.cookies.get("lastActivity")?.value;

  // Step 1: Reject sessions that have already crossed the idle limit
  if (isIdleExpired(lastActivity)) {
    return unauthorized("Session expired due to inactivity");
  }

  // Step 2: If the access token is still valid, only refresh last activity
  if (await hasValidAccessToken(accessToken)) {
    const response = successResponse("Activity recorded");
    setLastActivityCookie(response);
    return response;
  }

  // Step 3: If active but access token expired, use refresh token to continue
  if (!refreshToken) {
    return unauthorized("Session expired");
  }

  try {
    const tokens = await authService.refresh(refreshToken);
    const response = successResponse("Session refreshed");

    setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    return response;
  } catch {
    return unauthorized("Session expired");
  }
}
