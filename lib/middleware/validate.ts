// Zod validation
import { ZodType } from 'zod'
import { ApiError } from '../utils/ApiError'

export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    throw new ApiError(400, 'Validation failed', errors)
  }

  return result.data
}