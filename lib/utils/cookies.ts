// lib/utils/cookies.ts
import { NextResponse } from "next/server"

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 15,
    path:     "/",
  })

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7,
    path:     "/",
  })
}

export function clearAuthCookies(response: NextResponse) {
  const options = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge:   0,
    path:     "/",
  }

  response.cookies.set("accessToken",  "", options)
  response.cookies.set("refreshToken", "", options)
}