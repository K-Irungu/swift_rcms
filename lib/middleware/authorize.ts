// Role guard
import { AuthPayload } from './authenticate'
import { ApiError } from '../utils/ApiError'

export function authorize(user: AuthPayload, ...allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action')
  }
}