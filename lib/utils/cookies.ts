import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN_MAX_AGE =
  Number(process.env.ACCESS_TOKEN_MAX_AGE) || 60 * 15;
const REFRESH_TOKEN_MAX_AGE =
  Number(process.env.REFRESH_TOKEN_MAX_AGE) || 60 * 60 * 24 * 7;
const LAST_ACTIVITY_MAX_AGE =
  Number(process.env.LAST_ACTIVITY_MAX_AGE) || 60 * 15;
const PENDING_REGISTRATION_MAX_AGE =
  Number(process.env.PENDING_REGISTRATION_MAX_AGE) || 60 * 5;

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const pendingRegistrationCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: PENDING_REGISTRATION_MAX_AGE,
};

export function setAccessTokenCookie(
  response: NextResponse,
  accessToken: string,
) {
  response.cookies.set("accessToken", accessToken, {
    ...authCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export function setRefreshTokenCookie(
  response: NextResponse,
  refreshToken: string,
) {
  response.cookies.set("refreshToken", refreshToken, {
    ...authCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function setLastActivityCookie(response: NextResponse) {
  response.cookies.set("lastActivity", String(Date.now()), {
    ...authCookieOptions,
    maxAge: LAST_ACTIVITY_MAX_AGE,
  });
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  setAccessTokenCookie(response, accessToken);
  setRefreshTokenCookie(response, refreshToken);
  setLastActivityCookie(response);
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set("accessToken", "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  response.cookies.set("refreshToken", "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  response.cookies.set("lastActivity", "", {
    ...authCookieOptions,
    maxAge: 0,
  });
}

export async function setPendingRegistrationCookie(
  response: NextResponse,
  {
    email,
    phoneNumber,
    fullName,
  }: { email: string; phoneNumber: string; fullName: string },
) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  const token = await new SignJWT({ email, phoneNumber, fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  response.cookies.set(
    "pendingRegistration",
    token,
    pendingRegistrationCookieOptions,
  );
}

export async function getPendingRegistrationCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pendingRegistration")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { email: string; phoneNumber: string; fullName: string };
  } catch {
    // Token expired or tampered with
    return null;
  }
}

export async function clearPendingRegistrationCookie(response: NextResponse) {
  response.cookies.set("pendingRegistration", "", {
    ...pendingRegistrationCookieOptions,
    maxAge: 0,
  });
}
