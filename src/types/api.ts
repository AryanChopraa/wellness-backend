/**
 * Standard API response shape. Every response from the API includes these fields
 * so the frontend can show a description message and handle blocked users.
 */

/** Top-level fields on every API response (success or error). */
export interface ApiResponseMeta {
  /** Whether the request succeeded. */
  success: boolean;
  /** Description message for the frontend (show in UI / toast). */
  message: string;
  /** If the current user is blocked; frontend should block access when true. */
  isBlocked: boolean;
}

/** Every error response: meta + error string (same as message). */
export interface ApiErrorResponse extends ApiResponseMeta {
  success: false;
  error: string;
}

/** Success responses: meta + endpoint-specific payload (e.g. user, token, posts). */
export type ApiSuccessResponse<T = unknown> = ApiResponseMeta & { success: true } & T;
