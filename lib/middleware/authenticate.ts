// lib/middleware/authenticate.ts
import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError"

export interface AuthPayload {
  userId: string
  role:   string
  email:  string
}

export function authenticate(req: NextRequest): AuthPayload {
  // Read token from httpOnly cookie 
  const token = req.cookies.get("accessToken")?.value

  if (!token) {
    throw ApiError.unauthorized("Not authenticated")
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
  } catch {
    throw ApiError.unauthorized("Invalid or expired token")
  }
}