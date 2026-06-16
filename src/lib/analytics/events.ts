/**
 * Rozo Analytics — Event Catalog (rozo-rewards-miniapp)
 *
 * Convention: {domain}_{action} — snake_case, no abbreviations.
 * Never rename existing events — add new ones following the same convention.
 */

export const GLOBAL_EVENTS = {
  USER_IDENTIFIED: "user_identified",
  USER_RESET: "user_reset",
  ERROR_OCCURRED: "error_occurred",
} as const;

export const PAYMENT_EVENTS = {
  PAYMENT_METHOD_SELECTED: "payment_method_selected",
  PAYMENT_CONFIRMED: "payment_confirmed",
  PAYMENT_COMPLETED: "payment_completed",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_CANCELLED: "payment_cancelled",
  PAYMENT_TX_HASH_IN_FAILED: "payment_tx_hash_in_failed",
} as const;

export const REWARDS_EVENTS = {
  MERCHANT_VIEWED: "merchant_viewed",
  MERCHANT_BOOKMARKED: "merchant_bookmarked",
  MERCHANT_SHARE_CLICKED: "merchant_share_clicked",
  REWARDS_REDEEMED: "rewards_redeemed",
  WALLET_BALANCE_VIEWED: "wallet_balance_viewed",
} as const;

export const DISCOVERY_EVENTS = {
  MAP_LOCATION_REQUESTED: "map_location_requested",
  NEARBY_MERCHANTS_VIEWED: "nearby_merchants_viewed",
  QR_CODE_SCANNED: "qr_code_scanned",
  SUPPORT_CONTACTED: "support_contacted",
} as const;

export const ROZO_EVENTS = {
  ...GLOBAL_EVENTS,
  ...PAYMENT_EVENTS,
  ...REWARDS_EVENTS,
  ...DISCOVERY_EVENTS,
} as const;

export type RozoEventName = (typeof ROZO_EVENTS)[keyof typeof ROZO_EVENTS];

export const ROZO_APP_NAME = "rozo-rewards-miniapp";
