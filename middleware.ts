// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// ─── Constants ────────────────────────────────────────────────────────────────

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

const protectedRoutes = [
  "/dashboard",
  "/properties",
  "/tenants",
  "/units",
  "/payments",
  "/billing",
  "/invoices",
  "/expenses",
  "/arrears",
  "/approvals",
  "/maintenance",
  "/messaging",
  "/settings",
];

const authRoutes = ["/auth/login", "/auth/register"];

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Step 1: Verify access token
  let isAuthenticated = false;
  if (accessToken) {
    try {
      await jwtVerify(accessToken, accessSecret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Step 2: If access token is expired but refresh token is valid, issue a new access token
  if (!isAuthenticated && refreshToken && isProtectedRoute) {
    console.log("Access token expired, attempting refresh...");

    try {
      const { payload } = await jwtVerify(refreshToken, refreshSecret);
      console.log("Refresh token valid, payload:", payload);

      const newAccessToken = await new SignJWT({
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("15m")
        .sign(accessSecret);

      // Step 3: Allow the request through and set the new access token cookie
      const response = NextResponse.next();
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 15,
        path: "/",
      });

      return response;
    } catch (err) {
      console.log("Refresh token invalid:", err);

      // Refresh token is also invalid — redirect to login
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  // Step 4: Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Step 5: Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}