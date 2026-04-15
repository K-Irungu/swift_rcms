export class ApiError extends Error {
  public statusCode: number
  public errors?: unknown[]

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(msg: string)     { return new ApiError(400, msg) }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg) }
  static forbidden(msg = 'Forbidden')      { return new ApiError(403, msg) }
  static notFound(msg = 'Not found')       { return new ApiError(404, msg) }
  static conflict(msg: string)       { return new ApiError(409, msg) }
  static internal(msg = 'Internal server error') { return new ApiError(500, msg) }
}