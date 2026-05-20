// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import {
  clearAuthCookies,
  setAccessTokenCookie,
  setLastActivityCookie,
} from "@/lib/utils/cookies";
// ─── Constants ────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS) || 15 * 60 * 1000;

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



// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname.startsWith(route));
}

function isIdleExpired(lastActivity?: string) {
  const lastActivityTime = Number(lastActivity);

  return !lastActivityTime || Date.now() - lastActivityTime > IDLE_TIMEOUT_MS;
}


function redirectToLogin(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", req.url));
  clearAuthCookies(response);
  return response;
}

async function verifyAccessToken(accessToken?: string) {
  if (!accessToken) return false;

  try {
    await jwtVerify(accessToken, accessSecret);
    return true;
  } catch {
    return false;
  }
}

async function createAccessTokenFromRefreshToken(refreshToken: string) {
  const { payload } = await jwtVerify(refreshToken, refreshSecret);

  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(accessSecret);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const lastActivity = req.cookies.get("lastActivity")?.value;

  // Step 1: Resolve the route type
  const isProtectedRoute = isRouteMatch(pathname, protectedRoutes);
  const isAuthRoute = isRouteMatch(pathname, authRoutes);
  const hasSessionCookie = Boolean(accessToken || refreshToken);

  // Step 2: End idle sessions before refresh-token logic can extend them
  if (
    (isProtectedRoute || isAuthRoute) &&
    hasSessionCookie &&
    isIdleExpired(lastActivity)
  ) {
    return redirectToLogin(req);
  }

  // Step 3: Verify the access token
  const isAuthenticated = await verifyAccessToken(accessToken);

  // Step 4: Refresh an expired access token only when the session is not idle
  if (!isAuthenticated && refreshToken && isProtectedRoute) {
    try {
      const newAccessToken =
        await createAccessTokenFromRefreshToken(refreshToken);
      const response = NextResponse.next();

      setAccessTokenCookie(response, newAccessToken);
      setLastActivityCookie(response);
      return response;
    } catch {
      return redirectToLogin(req);
    }
  }

  // Step 5: Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    return redirectToLogin(req);
  }

  // Step 6: Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Step 7: Allow the request and record fresh activity on protected pages
  const response = NextResponse.next();

  if (isProtectedRoute && isAuthenticated) {
    setLastActivityCookie(response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
