import { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { authenticate } from '@/lib/middleware/authenticate'
import { authService } from '@/lib/services/auth.service'
import { successResponse } from '@/lib/utils/ApiResponse'

export const POST = asyncHandler(async (req: NextRequest) => {
  const user = authenticate(req)
  await authService.logout(user.userId)
  return successResponse(null, 'Logged out successfully')
})