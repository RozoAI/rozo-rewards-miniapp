/**
 * Error handling for `window.rozo` (see docs/WINDOW_ROZO_INTEGRATION.md).
 * The wallet app does not send error.code — all errors are matched by message string.
 */

export function isUserCancellation(error: unknown): boolean {
  const msg = errorToString(error);
  return /user.*(rejected|cancelled)|passkey.*cancelled/i.test(msg);
}

/** Maps a raw error string to a user-safe message. Single source of truth for all Rozo payment errors. */
export function formatRozoErrorMessage(raw: string | undefined): string {
  const s = raw ?? "";
  if (/balance is not sufficient|INSUFFICIENT_BALANCE/i.test(s))
    return "Insufficient balance to complete this payment.";
  if (/timed out|TIMEOUT/i.test(s))
    return "Request timed out. Please try again.";
  if (/too many requests|RATE_LIMITED/i.test(s))
    return "Too many requests. Please wait a moment and try again.";
  if (/service.*unavailable|SERVICE_UNAVAILABLE|relayer/i.test(s))
    return "Payment service temporarily unavailable. Please try again later.";
  if (/simulation failed|simulation did not return|SIMULATION_FAILED/i.test(s))
    return "Payment could not be processed. Please try again.";
  if (/no auth entries|AUTHORIZATION_FAILED|signing.*failed|SIGNING_FAILED/i.test(s))
    return "Authorization failed. Please try again.";
  if (/submission.*failed|SUBMISSION_FAILED/i.test(s))
    return "Failed to submit transaction. Please try again.";
  if (/wallet.*not.*connected|WALLET_NOT_CONNECTED/i.test(s))
    return "Wallet not connected. Please reconnect and try again.";
  if (/wallet.*not.*deployed|WALLET_NOT_DEPLOYED/i.test(s))
    return "Wallet not set up yet. Please complete wallet setup first.";
  if (/amount.*too.*low|AMOUNT_TOO_LOW|INVALID_AMOUNT/i.test(s))
    return "Payment amount is too low. Please enter a larger amount.";
  if (/amount.*too.*high|AMOUNT_TOO_HIGH/i.test(s))
    return "Payment amount exceeds your limit.";
  if (/network.*error|NETWORK_ERROR/i.test(s))
    return "Network error. Please check your connection and try again.";
  return "Payment failed. Please try again.";
}

export function errorToString(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error)
    return String((error as Record<string, unknown>).message);
  return String(error);
}
