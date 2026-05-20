import { NextResponse } from "next/server";

const ACCESS_TOKEN_MAX_AGE = Number(process.env.ACCESS_TOKEN_MAX_AGE) || 60 * 15;
const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_MAX_AGE) || 60 * 60 * 24 * 7;
const LAST_ACTIVITY_MAX_AGE = Number(process.env.LAST_ACTIVITY_MAX_AGE) || 60 * 15;

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
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