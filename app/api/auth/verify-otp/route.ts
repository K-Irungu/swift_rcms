// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validate } from '@/lib//middleware/validate'
import { ApiError } from '@/lib/utils/ApiError'
import redis, { connectRedis } from '@/lib/redis'

const schema = z.object({
  otp:   z.string().length(6, 'OTP must be 6 digits'),
  phone: z.string().min(1, 'Phone is required'),
  mode:  z.enum(['register', 'login', 'reset']),
})

export async function POST(req: NextRequest) {
  try {
    await connectRedis()

    const body = await req.json()
    const { otp, phone, mode } = validate(schema, body)

    const raw = await redis.get(`otp:${phone}`)

    if (!raw) {
      throw new ApiError(400, 'OTP expired or not found. Please request a new one.')
    }

    const stored = JSON.parse(raw) as {
      otp:      string
      email:    string
      fullName: string
      mode:     string
    }

    if (stored.mode !== mode) {
      throw new ApiError(400, 'Invalid OTP context.')
    }

    if (stored.otp !== otp) {
      throw new ApiError(400, 'Incorrect OTP. Please try again.')
    }

    await redis.del(`otp:${phone}`)

    if (mode === 'register') {
      await redis.set(
        `verified:${phone}`,
        JSON.stringify({ phone, email: stored.email, fullName: stored.fullName }),
        { EX: 600 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode }
      )
    }

    console.error('verify-otp error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong' },
      { status: 500 }
    )
  }
}