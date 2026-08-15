import { NextResponse } from "next/server";

/**
 * Standardized API response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
    } as ApiResponse<T>,
    { status }
  );
}

/**
 * Create an error response with validation errors
 */
export function validationErrorResponse(
  errors: Array<{ path: string; message: string }>,
  message = "Validation failed"
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    } as ApiResponse,
    { status: 400 }
  );
}

/**
 * Create a generic error response
 */
export function errorResponse(message: string, status = 500) {
  return NextResponse.json(
    {
      success: false,
      message,
    } as ApiResponse,
    { status }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(message = "Resource not found") {
  return NextResponse.json(
    {
      success: false,
      message,
    } as ApiResponse,
    { status: 404 }
  );
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json(
    {
      success: false,
      message,
    } as ApiResponse,
    { status: 401 }
  );
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json(
    {
      success: false,
      message,
    } as ApiResponse,
    { status: 403 }
  );
}

/**
 * Handle common error types and return appropriate responses
 */
export function handleApiError(error: unknown, context?: string) {
  console.error(`[API Error${context ? ` - ${context}` : ""}]`, error);

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred. Please try again later.";

  return errorResponse(message, 500);
}
