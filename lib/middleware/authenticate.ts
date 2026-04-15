// JWT Verification
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError'

export interface AuthPayload {
  userId: string
  role: string
  email: string
}

export function authenticate(req: NextRequest): AuthPayload {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid authorization header')
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    return payload
  } catch {
    throw ApiError.unauthorized('Invalid or expired token')
  }
}