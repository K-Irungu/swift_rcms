export class ApiError extends Error {
  public readonly statusCode: number
  public readonly errors?: unknown[]

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message)

    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errors = errors

    Object.setPrototypeOf(this, new.target.prototype)
  }

  static badRequest(msg = 'Bad request', errors?: unknown[]) {
    return new ApiError(400, msg, errors)
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg)
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg)
  }

  static notFound(msg = 'Not found') {
    return new ApiError(404, msg)
  }

  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg)
  }

  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg)
  }
}