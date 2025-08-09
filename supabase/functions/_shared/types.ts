// Shared types for Rozo Rewards MiniApp Edge Functions

export interface User {
  id: string;
  wallet_address: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  total_cashback_earned: number; // USD for backward compatibility
  total_cashback_claimed: number; // USD for backward compatibility
  total_cashback_rozo: number; // Total ROZO earned
  available_cashback_rozo: number; // Available ROZO balance
  used_cashback_rozo: number; // Total ROZO used
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referral_code: string;
  referred_by?: string;
  // CDP Spend Permission fields
  spend_permission_authorized: boolean;
  spend_permission_allowance: number;
  spend_permission_expiry?: string;
  last_spend_permission_check?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: 'AI' | 'CRYPTO' | 'COMMERCE' | 'DOMAIN' | 'MARKETING' | 'GAMING';
  description?: string;
  logo_url?: string;
  website_url: string;
  domain: string;
  cashback_percentage: number;
  is_featured: boolean;
  is_active: boolean;
  location?: {
    address_line1: string;
    address_line2?: string;
    formatted_address: string;
    lat: number;
    lon: number;
  };
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  product_id?: string;
  transaction_hash: string;
  amount: number; // Final amount paid after ROZO offset
  original_amount_usd?: number; // Original amount before ROZO offset
  rozo_offset_amount?: number; // ROZO tokens used as payment offset
  final_amount_usd?: number; // Final amount after ROZO offset
  currency: string;
  cashback_amount: number; // Legacy USD cashback amount
  cashback_percentage: number;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  to_address: string;
  from_address: string;
  chain_id: number;
  block_number?: number;
  gas_used?: number;
  gas_price?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Cashback {
  id: string;
  user_id: string;
  transaction_id?: string;
  type: 'purchase_cashback' | 'referral_bonus' | 'tier_bonus' | 'promotion';
  amount_rozo: number; // Amount in ROZO tokens (integer)
  amount_usd: number; // USD equivalent for reference
  currency: string;
  status: 'pending' | 'available' | 'used' | 'expired';
  used_at?: string;
  used_in_transaction_id?: string;
  expires_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  description?: string;
  price_usd: number;
  currency: string;
  cashback_rate: number; // Percentage cashback rate for this specific product
  image_url?: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'cart' | 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  subtotal_usd: number;
  rozo_offset_amount: number; // ROZO tokens used for payment offset
  rozo_offset_usd: number; // USD value of ROZO offset
  final_amount_usd: number; // Amount to be paid after ROZO offset
  tax_amount_usd: number;
  fee_amount_usd: number;
  total_cashback_rozo: number; // Total ROZO to be earned
  total_cashback_usd: number; // USD equivalent
  payment_intent_id?: string;
  transaction_id?: string;
  payment_method: string;
  currency: string;
  chain_id?: number;
  cart_created_at?: string;
  checkout_at?: string;
  paid_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  shipping_address?: Record<string, any>;
  billing_address?: Record<string, any>;
  delivery_notes?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_description?: string;
  unit_price_usd: number;
  cashback_rate: number; // Product's cashback rate at time of purchase
  quantity: number;
  line_total_usd: number; // unit_price * quantity
  line_cashback_rozo: number; // ROZO to be earned for this line
  line_cashback_usd: number; // USD equivalent
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// CDP Payment System Types
export interface ProcessPaymentRequest {
  receiver: string;           // Merchant wallet address
  cashback_rate: number;      // Percentage (e.g., 1, 5)
  amount: number;             // USD amount
  is_using_credit: boolean;   // true = use ROZO credits, false = direct payment
  user_signature?: string;    // Optional: for additional verification
  nonce?: string;            // Optional: for replay protection
}

export interface ProcessPaymentResponse {
  transaction_id: string;
  payment_method: "direct_usdc" | "rozo_credit";
  amount_paid_usd: number;
  rozo_balance_change: number; // Positive for earned, negative for spent
  new_rozo_balance: number;
  cashback_earned?: number;    // Only for direct payments
  tx_hash?: string;           // Only for direct payments
}

export interface PaymentEligibility {
  eligible: boolean;
  reason?: string;
  payment_method?: 'direct_usdc' | 'rozo_credit';
  rozo_cost?: number;
  remaining_balance?: number;
  allowance_remaining?: number;
  required?: number;
  available?: number;
  allowance?: number;
  recommendations?: string[];
}

export interface SpendPermission {
  user_id: string;
  authorized: boolean;
  allowance: number;
  expiry: string | null;
  last_check: string;
  status: 'active' | 'expired' | 'unauthorized' | 'insufficient_allowance';
  recommendations: string[];
}

export interface PaymentIntent {
  id: string;
  user_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  chain_id: number;
  to_address: string;
  cashback_amount: number;
  cashback_percentage: number;
  status: 'created' | 'confirmed' | 'expired' | 'cancelled';
  expires_at: string;
  transaction_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ErrorCode {
  UNAUTHORIZED: 'UNAUTHORIZED';
  FORBIDDEN: 'FORBIDDEN';
  NOT_FOUND: 'NOT_FOUND';
  VALIDATION_ERROR: 'VALIDATION_ERROR';
  TRANSACTION_FAILED: 'TRANSACTION_FAILED';
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE';
  RATE_LIMITED: 'RATE_LIMITED';
  INTERNAL_ERROR: 'INTERNAL_ERROR';
  INVALID_SIGNATURE: 'INVALID_SIGNATURE';
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND';
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND';
  REWARD_NOT_AVAILABLE: 'REWARD_NOT_AVAILABLE';
  PAYMENT_INTENT_EXPIRED: 'PAYMENT_INTENT_EXPIRED';
  REFERRAL_CODE_INVALID: 'REFERRAL_CODE_INVALID';
}

export const ERROR_CODES: ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  REWARD_NOT_AVAILABLE: 'REWARD_NOT_AVAILABLE',
  PAYMENT_INTENT_EXPIRED: 'PAYMENT_INTENT_EXPIRED',
  REFERRAL_CODE_INVALID: 'REFERRAL_CODE_INVALID',
};
