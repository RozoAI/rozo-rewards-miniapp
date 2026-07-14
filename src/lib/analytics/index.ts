import posthog from "posthog-js";
import type { RozoEventName } from "./events";
import type { IdentifyProperties } from "./properties";

/**
 * Allowlist of property keys safe to send to PostHog. Anything not listed
 * here is dropped to avoid leaking wallet signatures, bridge addresses,
 * memos, raw provider payloads, or other sensitive routing data.
 */
const ALLOWED_PROPERTY_KEYS = new Set([
  "merchant_id",
  "merchant_name",
  "category",
  "payment_method",
  "amount_usd",
  "order_id",
  "rozo_amount",
  "usd_value_offset",
  "cashback_earned",
  "rozo_balance",
  "action",
  "channel",
  "merchant_count",
  "qr_type",
  "error_message",
  "error_context",
  "fid",
  "wallet_address",
  "chain",
]);

function sanitizeProperties(
  properties?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!properties) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (ALLOWED_PROPERTY_KEYS.has(key) && value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function capture(
  event: RozoEventName,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, sanitizeProperties(properties));
}

export function identifyUser(
  walletAddress: string,
  properties?: Omit<IdentifyProperties, "wallet_address">,
) {
  if (typeof window === "undefined") return;
  const address = walletAddress.toLowerCase();
  posthog.identify(address, {
    wallet_address: address,
    ...sanitizeProperties(properties as Record<string, unknown>),
  });
}

export function resetUser() {
  if (typeof window === "undefined") return;
  posthog.reset();
}
