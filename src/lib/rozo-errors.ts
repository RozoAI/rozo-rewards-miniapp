/**
 * Structured errors from `window.rozo` (see docs/WINDOW_ROZO_INTEGRATION.md).
 */

export type RozoErrorCode =
  | "USER_REJECTED"
  | "USER_CANCELLED"
  | "PASSKEY_CANCELLED"
  | "WALLET_NOT_CONNECTED"
  | "WALLET_NOT_DEPLOYED"
  | "BRIDGE_NOT_AVAILABLE"
  | "INVALID_PARAMS"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_AMOUNT"
  | "AMOUNT_TOO_LOW"
  | "AMOUNT_TOO_HIGH"
  | "SIGNING_FAILED"
  | "SUBMISSION_FAILED"
  | "SIMULATION_FAILED"
  | "AUTHORIZATION_FAILED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "UNSUPPORTED_METHOD"
  | "UNKNOWN_ERROR"
  | (string & {});

export interface RozoProviderError {
  code: RozoErrorCode;
  message: string;
  recoverySuggestion?: string;
}

export function isRozoProviderError(
  error: unknown,
): error is RozoProviderError {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

export function isUserCancellation(error: unknown): boolean {
  if (!isRozoProviderError(error)) return false;
  const { code } = error;
  return (
    code === "USER_REJECTED" ||
    code === "USER_CANCELLED" ||
    code === "PASSKEY_CANCELLED"
  );
}

/** Retryable network / infra errors (for future use, e.g. retry UI). */
export function isRetryableRozoError(error: unknown): boolean {
  if (!isRozoProviderError(error)) return false;
  switch (error.code) {
    case "TIMEOUT":
    case "NETWORK_ERROR":
    case "SERVICE_UNAVAILABLE":
    case "RATE_LIMITED":
      return true;
    default:
      return false;
  }
}

/**
 * User-facing text: wallet `message` plus optional `recoverySuggestion`.
 */
export function formatRozoErrorMessage(error: RozoProviderError): string {
  return error.recoverySuggestion
    ? `${error.message}. ${error.recoverySuggestion}`
    : error.message;
}
