import { NextRequest } from 'next/server'
import { z } from 'zod'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { validate } from '@/lib/middleware/validate'
import { authService } from '@/lib/services/auth.service'
import { successResponse } from '@/lib/utils/ApiResponse'
import { Role } from '@/lib/models/User'

const registerSchema = z.object({
  fullName:    z.string().min(2),
  email:       z.string().email(),
  password:    z.string().min(8),
  phoneNumber: z.string().min(10),
  role:        z.nativeEnum(Role),
})

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json()
  const input = validate(registerSchema, body)
  const result = await authService.register(input)
  return successResponse(result, 'Registration successful', 201)
})