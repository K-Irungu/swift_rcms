import { NextRequest } from 'next/server'
import { z } from 'zod'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { validate } from '@/lib/middleware/validate'
import { authService } from '@/lib/services/auth.service'
import { successResponse } from '@/lib/utils/ApiResponse'

const schema = z.object({ refreshToken: z.string() })

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json()
  const { refreshToken } = validate(schema, body)
  const tokens = await authService.refresh(refreshToken)
  return successResponse(tokens, 'Token refreshed')
})