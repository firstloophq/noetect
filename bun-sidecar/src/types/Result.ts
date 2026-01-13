/**
 * Error codes for failures, mirroring common HTTP status codes
 * but maintaining flexibility for custom codes
 */
export const ErrorCodes = {
    BAD_REQUEST: "err:bad_request",
    UNAUTHORIZED: "err:unauthorized",
    FORBIDDEN: "err:forbidden",
    NOT_FOUND: "err:not_found",
    CONFLICT: "err:conflict",
    UNPROCESSABLE_ENTITY: "err:unprocessable_entity",
    INTERNAL_SERVER_ERROR: "err:internal_server_error",
    UNKNOWN: "err:unknown",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type Result<T = unknown> =
    | {
          success: true;
          data: T;
      }
    | {
          success: false;
          code: ErrorCode;
          message: string;
          error?: unknown;
      };

export function success<T = unknown>(data: T): Result<T> {
    return {
        success: true,
        data,
    };
}

export function failure(code: ErrorCode, message: string, error?: unknown): Result<never> {
    return {
        success: false,
        code,
        message,
        error,
    };
}
