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

/** Maps structured error codes and raw message patterns to human-readable text. */
function humanizeRozoMessage(error: RozoProviderError): string {
  switch (error.code) {
    case "USER_REJECTED":
    case "USER_CANCELLED":
    case "PASSKEY_CANCELLED":
      return "Payment cancelled.";
    case "INSUFFICIENT_BALANCE":
      return "Insufficient balance to complete this payment.";
    case "WALLET_NOT_CONNECTED":
      return "Wallet not connected. Please reconnect and try again.";
    case "WALLET_NOT_DEPLOYED":
      return "Wallet not set up yet. Please complete wallet setup first.";
    case "INVALID_AMOUNT":
    case "AMOUNT_TOO_LOW":
      return "Payment amount is too low. Please enter a larger amount.";
    case "AMOUNT_TOO_HIGH":
      return "Payment amount exceeds your limit.";
    case "NETWORK_ERROR":
      return "Network error. Please check your connection and try again.";
    case "TIMEOUT":
      return "Request timed out. Please try again.";
    case "RATE_LIMITED":
      return "Too many requests. Please wait a moment and try again.";
    case "SERVICE_UNAVAILABLE":
      return "Payment service temporarily unavailable. Please try again later.";
    case "SIGNING_FAILED":
    case "AUTHORIZATION_FAILED":
      return "Authorization failed. Please try again.";
    case "SIMULATION_FAILED": {
      const msg = error.message ?? "";
      if (msg.includes("balance is not sufficient to spend")) {
        return "Insufficient balance to complete this payment.";
      }
      if (msg.includes("contract call failed")) {
        return "Payment contract error. Please try again or contact support.";
      }
      return "Transaction simulation failed. Please try again.";
    }
    case "SUBMISSION_FAILED":
      return "Failed to submit transaction. Please try again.";
    default:
      return error.message || "Payment failed. Please try again.";
  }
}

/**
 * User-facing text: maps error codes and raw messages to readable strings,
 * appending recoverySuggestion when present.
 */
export function formatRozoErrorMessage(error: RozoProviderError): string {
  const base = humanizeRozoMessage(error);
  return error.recoverySuggestion ? `${base} ${error.recoverySuggestion}` : base;
}
