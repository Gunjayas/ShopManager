import type { FastifyInstance } from "fastify";

export class ApiError extends Error {
  // Converts a business failure into a safe, human-readable HTTP response.
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
  ) {
    super(message);
  }
}

// Ensures an identifier is a positive integer before it reaches a database query.
export function parseId(value: string, fieldName = "id") {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new ApiError(400, "Invalid identifier", `${fieldName} must be a positive integer.`);
  }
  return parsedValue;
}

// Ensures a required text field contains a meaningful business value.
export function requireText(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, "Invalid request", `${fieldName} is required.`);
  }
  return value.trim();
}

// Ensures a money or count field is a whole non-negative number.
export function requireNonNegativeInteger(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(400, "Invalid request", `${fieldName} must be a non-negative integer.`);
  }
  return value;
}

// Ensures a count that creates records is greater than zero.
export function requirePositiveInteger(value: unknown, fieldName: string) {
  const parsedValue = requireNonNegativeInteger(value, fieldName);
  if (parsedValue === 0) {
    throw new ApiError(400, "Invalid request", `${fieldName} must be greater than zero.`);
  }
  return parsedValue;
}

// Installs one error shape for validation, business rules, and unexpected failures.
export function installErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((caughtError, _request, reply) => {
    if (caughtError instanceof ApiError) {
      return reply.status(caughtError.statusCode).send({
        error: caughtError.error,
        message: caughtError.message,
      });
    }

    app.log.error(caughtError);
    return reply.status(500).send({
      error: "Unexpected server error",
      message: "The request could not be completed. Please try again.",
    });
  });
}
