import { NextRequest } from 'next/server'
import { z } from 'zod'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { validate } from '@/lib/middleware/validate'
import { authService } from '@/lib/services/auth.service'
import { successResponse } from '@/lib/utils/ApiResponse'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json()
  const input = validate(loginSchema, body)
  const result = await authService.login(input)
  return successResponse(result, 'Login successful')
})