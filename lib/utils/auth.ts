// lib/utils/auth.ts
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export interface AuthUser {
  userId:   string
  role:     string
  email:    string
  fullName: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token       = cookieStore.get("accessToken")?.value

  if (!token) return null

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser
  } catch {
    return null
  }
}