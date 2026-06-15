/**
 * Rozo Analytics — Property Schema (rozo-rewards-miniapp)
 *
 * Property rules:
 *   - Keys          → snake_case
 *   - amount fields → STRING decimal, never number
 *   - addresses     → lowercase hex string
 *   - status/state  → lowercase string enum
 */

export type AmountString = string;
export type AddressString = string;

export type PaymentMethod = "rozo_wallet" | "crypto" | "points";

export interface PaymentProperties {
  merchant_id?: string;
  merchant_name?: string;
  payment_method?: PaymentMethod;
  amount_usd?: AmountString;
  order_id?: string;
  rozo_amount?: AmountString;
  usd_value_offset?: AmountString;
  cashback_earned?: AmountString;
  error_message?: string;
}

export interface RewardsProperties {
  merchant_id?: string;
  merchant_name?: string;
  category?: string;
  action?: "add" | "remove";
  channel?: string;
  rozo_balance?: AmountString;
}

export interface DiscoveryProperties {
  merchant_count?: number;
  qr_type?: string;
  channel?: "intercom" | "telegram";
}

export interface ErrorProperties {
  error_message: string;
  error_context?: string;
}

export interface IdentifyProperties {
  wallet_address: AddressString;
  rozo_balance?: AmountString;
  fid?: number | null;
}
