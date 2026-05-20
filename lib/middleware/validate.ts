// Zod validation
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Transform Zod errors into a more client-friendly format
    const errors = result.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    // Throw an ApiError - badRequest - with status 400 and the validation errors
    throw ApiError.badRequest("Validation failed", errors);
  }

  return result.data;
}
