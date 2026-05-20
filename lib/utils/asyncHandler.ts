// This utility function wraps route handlers to catch errors and return standardized error responses. 
// Essentially it abstracts away the try-catch logic from individual route handlers, allowing them to focus on their core functionality.
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from './ApiError'
import { errorResponse } from './ApiResponse'

type RouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>

export function asyncHandler(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context)
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.message, error.statusCode, error.errors)
      }
      console.error('[Unhandled Error]', error)
      return errorResponse('Internal server error', 500)
    }
  }
}