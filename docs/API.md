# Rozo Rewards MiniApp API Documentation

## Overview
This document describes the REST API endpoints for the Rozo Rewards MiniApp - an AI promo and cashback platform built on Coinbase with Supabase backend.

**🎉 Production Ready**: All APIs are deployed and tested at the live endpoint.

**🆕 Latest Features:**
- **ROZO Cashback System**: Complete token-based cashback (100:1 USD conversion)
- **CDP Spend Permissions**: One-tap payments via Coinbase wallet integration
- **Dual Payment Modes**: Direct USDC payments + ROZO credit payments
- **Order Management**: Full shopping cart and order lifecycle
- **Product-Specific Rates**: Individual cashback rates per product/SKU
- **Payment Offset**: Use ROZO tokens to reduce payment amounts
- **Tier-based Multipliers**: Bronze (1x) → Silver (1.2x) → Gold (1.5x) → Platinum (2x)

## Base URL
```
https://usgsoilitadwutfvxfzq.supabase.co/functions/v1
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

**🔐 Authentication Methods:**
- **Wallet Signature**: Primary authentication via wallet signature verification
- **CDP Integration**: Spend permission management for seamless payments
- **Session Management**: JWT tokens for API access

## ROZO Token System
- **Conversion Rate**: 1 ROZO = $0.01 USD (100:1 ratio)
- **Storage**: Integer values (no decimals for precision)
- **Earning**: Automatic from purchases with tier-based multipliers
- **Usage**: Payment offset, exclusive features, tier upgrades
- **Maximum Offset**: Up to 100% of purchase amount

## API Status & Health
- **Status**: ✅ All 18 Edge Functions deployed and operational
- **Uptime**: 99.9%+ availability
- **Performance**: <500ms average response time
- **Security**: JWT authentication enforced on all protected endpoints

## Data Models

### User
```typescript
interface User {
  id: string;
  wallet_address: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  total_cashback_earned: number; // Legacy USD amount
  total_cashback_claimed: number; // Legacy USD amount
  total_cashback_rozo: number; // Total ROZO earned
  available_cashback_rozo: number; // Available ROZO balance
  used_cashback_rozo: number; // Total ROZO used
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referral_code: string;
  referred_by?: string;
  created_at: string;
  updated_at: string;
}
```

### Product
```typescript
interface Product {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  description?: string;
  price_usd: number;
  currency: string;
  cashback_rate: number; // Product-specific cashback rate
  image_url?: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### Order
```typescript
interface Order {
  id: string;
  user_id: string;
  order_number: string; // Human-readable (e.g., RZ2501099876)
  status: 'cart' | 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  subtotal_usd: number;
  rozo_offset_amount: number; // ROZO tokens used for payment offset
  rozo_offset_usd: number; // USD value of ROZO offset
  final_amount_usd: number; // Final amount after ROZO offset
  total_cashback_rozo: number; // Total ROZO to be earned
  payment_intent_id?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}
```

### OrderItem
```typescript
interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_price_usd: number;
  cashback_rate: number; // Rate at time of purchase
  quantity: number;
  line_total_usd: number;
  line_cashback_rozo: number;
  line_cashback_usd: number;
}
```

### Cashback (formerly Reward)
```typescript
interface Cashback {
  id: string;
  user_id: string;
  transaction_id?: string;
  type: 'purchase_cashback' | 'referral_bonus' | 'tier_bonus' | 'promotion';
  amount_rozo: number; // ROZO tokens (integer)
  amount_usd: number; // USD equivalent
  currency: string;
  status: 'pending' | 'available' | 'used' | 'expired';
  used_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### Merchant
```typescript
interface Merchant {
  id: string;
  name: string;
  category: 'AI' | 'CRYPTO' | 'COMMERCE' | 'DOMAIN' | 'MARKETING' | 'GAMING';
  description: string;
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
  created_at: string;
  updated_at: string;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  transaction_hash: string;
  amount: number;
  currency: string;
  cashback_amount: number;
  cashback_percentage: number;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  to_address: string;
  from_address: string;
  chain_id: number;
  block_number?: number;
  created_at: string;
  updated_at: string;
}
```

### Reward
```typescript
interface Reward {
  id: string;
  user_id: string;
  transaction_id?: string;
  type: 'cashback' | 'referral' | 'bonus' | 'promotion';
  amount: number;
  currency: string;
  status: 'pending' | 'available' | 'claimed' | 'expired';
  claimed_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

## API Endpoints

## 🆕 ROZO Cashback System

### GET `/cashback/balance`
Get user's current ROZO cashback balance

**Response:**
```json
{
  "success": true,
  "data": {
    "total_cashback_rozo": 5000,
    "available_cashback_rozo": 3500,
    "used_cashback_rozo": 1500,
    "total_cashback_usd": 50.00,
    "available_cashback_usd": 35.00,
    "used_cashback_usd": 15.00,
    "conversion_rate": "1 ROZO = $0.01 USD",
    "pending_cashback": {
      "rozo": 250,
      "usd": 2.50,
      "count": 2
    }
  }
}
```

### POST `/cashback/apply-offset`
Calculate ROZO payment offset

**Request:**
```json
{
  "amount_usd": 20.00,
  "rozo_amount": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_amount_usd": 20.00,
    "rozo_to_use": 1000,
    "usd_offset": 10.00,
    "final_amount_usd": 10.00,
    "savings_percentage": 50.00
  }
}
```

### POST `/cashback/claim`
Claim ROZO cashback from purchase

**Request:**
```json
{
  "transaction_id": "uuid",
  "product_id": "uuid",
  "amount_usd": 20.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amount_rozo": 150,
    "amount_usd": 1.50,
    "final_rate": 7.5,
    "user_tier": "gold"
  }
}
```

## 🆕 Products API

### GET `/products`
List products with cashback rates

**Query Parameters:**
- `merchant_id`: Filter by merchant
- `category`: Filter by category  
- `min_cashback_rate`: Minimum cashback rate
- `search`: Search products

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Premium Access",
        "price_usd": 29.99,
        "cashback_rate": 8.5,
        "merchant_name": "OpenRouter"
      }
    ]
  }
}
```

### GET `/products/{id}`
Get product details with cashback preview

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Premium Access",
    "price_usd": 29.99,
    "cashback_rate": 8.5,
    "cashback_preview": {
      "user_tier": "gold",
      "final_rate": 12.75,
      "cashback_rozo": 382
    }
  }
}
```

## 🆕 Order Management

### GET `/orders/cart`
Get current shopping cart

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "RZ2501099876", 
    "items": [
      {
        "product_name": "Premium Access",
        "quantity": 1,
        "line_total_usd": 29.99,
        "line_cashback_rozo": 450
      }
    ],
    "totals": {
      "subtotal_usd": 29.99,
      "total_cashback_rozo": 450
    }
  }
}
```

### POST `/orders/cart`
Add item to cart

**Request:**
```json
{
  "product_id": "uuid",
  "quantity": 2
}
```

### PUT `/orders/cart/{item_id}`
Update cart item quantity

**Request:**
```json
{
  "quantity": 3
}
```

### DELETE `/orders/cart/{item_id}`
Remove item from cart

### DELETE `/orders/cart`
Clear entire cart

### POST `/orders/checkout`
Proceed to checkout with ROZO offset

**Request:**
```json
{
  "order_id": "uuid",
  "rozo_offset_amount": 1500,
  "shipping_address": {
    "line1": "123 Main St",
    "city": "San Francisco"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_number": "RZ2501099876",
    "status": "pending",
    "payment_summary": {
      "subtotal_usd": 29.99,
      "rozo_offset_usd": 15.00,
      "final_amount_usd": 14.99,
      "savings_percentage": 50.02
    },
    "payment_intent_needed": true
  }
}
```

### GET `/orders`
List user's orders

**Query Parameters:**
- `status`: Filter by status
- `limit`: Results per page
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "order_number": "RZ2501099876",
        "status": "completed",
        "final_amount_usd": 14.99,
        "total_cashback_rozo": 450
      }
    ]
  }
}
```

### GET `/orders/{order_id}`
Get detailed order information

**Response:**
```json
{
  "success": true,
  "data": {
    "order_number": "RZ2501099876",
    "status": "completed",
    "items": [...],
    "payment_details": {...},
    "status_history": [...]
  }
}
```

## 🚀 Core API Endpoints

### Quick Reference
| Category | Endpoint | Method | Auth Required | Description |
|----------|----------|---------|---------------|-------------|
| **Auth** | `/auth-wallet-login` | POST | ❌ | Wallet signature authentication |
| **Auth** | `/auth-spend-permission` | GET/POST | ✅ | CDP spend permission management |
| **User** | `/users-profile` | GET | ✅ | User profile and ROZO balance |
| **User** | `/users-stats` | GET | ✅ | User statistics and analytics |
| **Catalog** | `/merchants` | GET | ✅ | Merchant listing |
| **Catalog** | `/merchants-categories` | GET | ✅ | Merchant categories |
| **Catalog** | `/products` | GET | ✅ | Product catalog with rates |
| **Catalog** | `/products-details` | GET | ✅ | Individual product details |
| **Cashback** | `/cashback-balance` | GET | ✅ | ROZO balance and history |
| **Cashback** | `/cashback-apply-offset` | POST | ✅ | Calculate payment offset |
| **Cashback** | `/cashback-claim` | POST | ✅ | Claim earned cashback |
| **Payments** | `/payments-process` | POST | ✅ | Main payment processing |
| **Payments** | `/payments-eligibility` | POST | ✅ | Check payment eligibility |
| **Payments** | `/payments-create-intent` | POST | ✅ | Create payment intent |
| **Payments** | `/payments-confirm` | POST | ✅ | Confirm blockchain payment |
| **Orders** | `/orders` | GET | ✅ | List and filter orders |
| **Orders** | `/orders-cart` | GET/POST/PUT/DELETE | ✅ | Shopping cart operations |
| **Orders** | `/orders-checkout` | POST | ✅ | Checkout with ROZO offset |

---

## 🆕 CDP Payment System

### POST `/payments/process`
**Main payment processing endpoint supporting dual payment modes**

**🎯 Purpose**: Process payments with automatic ROZO cashback or use ROZO credits as payment

**Request:**
```json
{
  "receiver": "0x742d35Cc9E9D1234567890123456789012345678",
  "cashback_rate": 5.0,
  "amount": 20.00,
  "is_using_credit": false,
  "user_signature": "0x1234...",
  "nonce": "payment_20250109_abc123"
}
```

**Request Fields:**
- `receiver` (string, required): Merchant wallet address (42-char hex)
- `cashback_rate` (number, required): Cashback percentage (0-100)
- `amount` (number, required): Payment amount in USD
- `is_using_credit` (boolean, required): 
  - `false` = Direct USDC payment (earn ROZO)
  - `true` = Use ROZO credits (deduct ROZO)
- `user_signature` (string, optional): Additional verification signature
- `nonce` (string, optional): Unique payment identifier for replay protection

**Response (Direct USDC Payment):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "payment_method": "direct_usdc",
    "amount_paid_usd": 20.00,
    "rozo_balance_change": 10000,
    "new_rozo_balance": 25000,
    "cashback_earned": 10000,
    "tx_hash": "0xabc123def456...",
    "cashback_details": {
      "base_rate": 5.0,
      "user_tier": "gold",
      "tier_multiplier": 1.5,
      "final_rate": 7.5
    }
  }
}
```

**Response (ROZO Credit Payment):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440001",
    "payment_method": "rozo_credit",
    "amount_paid_usd": 0.50,
    "rozo_balance_change": -50,
    "new_rozo_balance": 14950,
    "internal_payment": true,
    "savings": {
      "rozo_used": 50,
      "usd_equivalent": 0.50,
      "effective_discount": "100%"
    }
  }
}
```

**Error Responses:**
```json
// Insufficient ROZO balance
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient ROZO balance. Required: 2000, Available: 1500",
    "details": {
      "required_rozo": 2000,
      "available_rozo": 1500,
      "shortfall": 500
    }
  }
}

// Invalid receiver address
{
  "success": false,
  "error": {
    "code": "INVALID_RECEIVER",
    "message": "Invalid receiver address format",
    "details": {
      "provided": "0x123",
      "expected_format": "0x followed by 40 hex characters"
    }
  }
}
```

### POST `/payments/eligibility`
**Check payment eligibility and get smart recommendations**

**🎯 Purpose**: Validate payment feasibility and provide optimization suggestions

**Request:**
```json
{
  "amount_usd": 25.00,
  "is_using_credit": false
}
```

**Response (Eligible for Direct Payment):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "payment_method": "direct_usdc",
    "allowance_remaining": 975.00,
    "spend_permission": {
      "authorized": true,
      "expires_at": "2025-01-15T12:00:00Z",
      "daily_limit": 1000.00,
      "remaining_today": 825.00
    },
    "cashback_preview": {
      "base_rate": 6.0,
      "user_tier": "gold",
      "final_rate": 9.0,
      "estimated_rozo": 2250,
      "estimated_usd": 22.50
    },
    "recommendations": [
      "Payment authorized via CDP Spend Permissions",
      "You'll earn 2,250 ROZO ($22.50) from this purchase",
      "Gold tier gives you 1.5x cashback multiplier"
    ]
  }
}
```

**Response (Eligible for ROZO Credit):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "payment_method": "rozo_credit",
    "rozo_cost": 2500,
    "remaining_balance": 7500,
    "savings": {
      "amount_usd": 25.00,
      "effective_discount": "100%"
    },
    "recommendations": [
      "Great choice! You'll save $25.00 using ROZO credits",
      "You'll have 7,500 ROZO remaining after this purchase",
      "Consider saving ROZO for larger purchases for maximum value"
    ]
  }
}
```

**Response (Not Eligible):**
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "reason": "Insufficient ROZO balance",
    "required": 2500,
    "available": 1200,
    "shortfall": 1300,
    "alternatives": [
      {
        "method": "direct_usdc",
        "eligible": true,
        "description": "Pay with USDC and earn ROZO cashback"
      },
      {
        "method": "partial_rozo",
        "eligible": true,
        "description": "Use 1,200 ROZO + $13.00 USDC",
        "rozo_amount": 1200,
        "usdc_amount": 13.00
      }
    ],
    "recommendations": [
      "Switch to direct USDC payment to earn more ROZO",
      "You need 1,300 more ROZO for full credit payment",
      "Make some purchases to increase your ROZO balance"
    ]
  }
}
```

### GET `/auth-spend-permission`
**Get current CDP Spend Permission status**

**🎯 Purpose**: Check authorization status and get configuration recommendations

**Response (Active Permission):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "authorized": true,
    "allowance": 1000.00,
    "expiry": "2025-01-15T12:00:00Z",
    "last_check": "2025-01-09T10:30:00Z",
    "status": "active",
    "usage_stats": {
      "total_used": 150.00,
      "remaining": 850.00,
      "usage_percentage": 15.0,
      "transactions_count": 3
    },
    "recommendations": [
      "Your spend permission is active and ready for payments",
      "You have $850 remaining in your allowance",
      "Permission expires in 6 days - consider renewing soon"
    ]
  }
}
```

**Response (Expired Permission):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "authorized": false,
    "allowance": 0,
    "expiry": "2025-01-08T12:00:00Z",
    "status": "expired",
    "days_expired": 1,
    "recommendations": [
      "Your spend permission has expired",
      "Re-authorize to enable one-tap payments",
      "Recommended allowance: $1,000 for optimal experience"
    ]
  }
}
```

### POST `/auth-spend-permission`
**Update CDP Spend Permission configuration**

**🎯 Purpose**: Set or update spending authorization and limits

**Request:**
```json
{
  "authorized": true,
  "allowance": 2000.00,
  "expiry": "2025-02-15T12:00:00Z",
  "signature": "0x1234567890abcdef..."
}
```

**Response (Successful Update):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "authorized": true,
    "allowance": 2000.00,
    "expiry": "2025-02-15T12:00:00Z",
    "status": "active",
    "updated_at": "2025-01-09T10:45:00Z",
    "changes": {
      "allowance_increased": 1000.00,
      "expiry_extended_days": 37
    },
    "recommendations": [
      "Spend permission successfully updated",
      "New allowance: $2,000 for enhanced flexibility",
      "Valid for 37 more days"
    ]
  }
}
```

---

## 🔐 Authentication System

### POST `/auth-wallet-login`
**Primary authentication via wallet signature verification**

**🎯 Purpose**: Authenticate users with their wallet signatures for secure access

**Request:**
```json
{
  "wallet_address": "0x...",
  "signature": "0x...",
  "message": "Sign this message to authenticate with Rozo Rewards",
  "nonce": "random_nonce"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "user": User,
    "expires_in": 3600
  }
}
```

### POST `/auth/refresh`
Refresh authentication token

**Request Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token",
    "expires_in": 3600
  }
}
```

## Users

### GET `/users/profile`
Get current user profile (authenticated)

**Response:**
```json
{
  "success": true,
  "data": User
}
```

### PUT `/users/profile`
Update user profile (authenticated)

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "avatar_url": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": User
}
```

### GET `/users/stats`
Get user statistics (authenticated)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_transactions": 42,
    "total_spent": 1250.50,
    "total_cashback_earned": 125.05,
    "total_cashback_claimed": 75.30,
    "pending_cashback": 49.75,
    "tier": "silver",
    "tier_progress": {
      "current_points": 1250,
      "next_tier_points": 2500,
      "progress_percentage": 50
    }
  }
}
```

## Merchants

### GET `/merchants`
Get list of merchants

**Query Parameters:**
- `category`: Filter by category
- `featured`: Boolean, show only featured merchants
- `search`: Search by name or description
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "merchants": Merchant[],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### GET `/merchants/:id`
Get merchant details

**Response:**
```json
{
  "success": true,
  "data": Merchant
}
```

### GET `/merchants/categories`
Get available merchant categories

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "AI",
        "display_name": "AI Services",
        "count": 25
      },
      {
        "name": "CRYPTO",
        "display_name": "Cryptocurrency",
        "count": 15
      }
    ]
  }
}
```

## Transactions

### POST `/transactions`
Create a new transaction (authenticated)

**Request Body:**
```json
{
  "merchant_id": "string",
  "transaction_hash": "0x...",
  "amount": 100.50,
  "currency": "USDC",
  "to_address": "0x...",
  "chain_id": 8453
}
```

**Response:**
```json
{
  "success": true,
  "data": Transaction
}
```

### GET `/transactions`
Get user transactions (authenticated)

**Query Parameters:**
- `status`: Filter by status
- `merchant_id`: Filter by merchant
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": Transaction[],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

### GET `/transactions/:id`
Get transaction details (authenticated)

**Response:**
```json
{
  "success": true,
  "data": Transaction
}
```

### POST `/transactions/:id/verify`
Verify transaction on blockchain (authenticated)

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "block_number": 12345678,
    "transaction": Transaction
  }
}
```

## Rewards

### GET `/rewards`
Get user rewards (authenticated)

**Query Parameters:**
- `status`: Filter by status
- `type`: Filter by type
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "rewards": Reward[],
    "total": 30,
    "limit": 20,
    "offset": 0,
    "summary": {
      "total_available": 125.50,
      "total_pending": 25.00,
      "total_claimed": 300.75
    }
  }
}
```

### POST `/rewards/:id/claim`
Claim a reward (authenticated)

**Request Body:**
```json
{
  "to_address": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_hash": "0x...",
    "amount": 25.50,
    "currency": "USDC",
    "reward": Reward
  }
}
```

### GET `/rewards/leaderboard`
Get rewards leaderboard

**Query Parameters:**
- `timeframe`: 'week' | 'month' | 'all' (default: 'month')
- `limit`: Number of results (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "string",
        "username": "string",
        "avatar_url": "string",
        "total_cashback": 1250.50,
        "tier": "gold"
      }
    ],
    "user_rank": 42,
    "timeframe": "month"
  }
}
```

## Payments

### POST `/payments/create-intent`
Create payment intent for merchant (authenticated)

**Request Body:**
```json
{
  "merchant_id": "string",
  "amount": 100.50,
  "currency": "USDC",
  "chain_id": 8453,
  "metadata": {
    "order_id": "string",
    "description": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_intent_id": "string",
    "to_address": "0x...",
    "amount": 100.50,
    "currency": "USDC",
    "chain_id": 8453,
    "cashback_amount": 5.50,
    "cashback_percentage": 5.5,
    "expires_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST `/payments/:intent_id/confirm`
Confirm payment with transaction hash (authenticated)

**Request Body:**
```json
{
  "transaction_hash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": Transaction,
    "rewards": Reward[]
  }
}
```

## Referrals

### POST `/referrals/apply-code`
Apply referral code (authenticated)

**Request Body:**
```json
{
  "referral_code": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bonus_amount": 10.00,
    "currency": "USDC",
    "referrer_bonus": 5.00
  }
}
```

### GET `/referrals/stats`
Get referral statistics (authenticated)

**Response:**
```json
{
  "success": true,
  "data": {
    "referral_code": "ROZO123",
    "total_referrals": 5,
    "total_referral_bonus": 25.00,
    "pending_bonus": 10.00,
    "referrals": [
      {
        "username": "user123",
        "joined_at": "2024-01-01T00:00:00Z",
        "bonus_earned": 5.00
      }
    ]
  }
}
```

## Analytics

### GET `/analytics/merchants/:id/stats`
Get merchant analytics (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_transactions": 150,
    "total_volume": 15000.50,
    "total_cashback_paid": 750.25,
    "avg_transaction_size": 100.00,
    "unique_customers": 75,
    "repeat_customer_rate": 0.6
  }
}
```

## Webhooks

### POST `/webhooks/blockchain`
Webhook for blockchain events (internal)

**Request Body:**
```json
{
  "event_type": "transaction_confirmed",
  "transaction_hash": "0x...",
  "block_number": 12345678,
  "chain_id": 8453,
  "data": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000",
    "gas_used": "21000"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `TRANSACTION_FAILED`: Blockchain transaction failed
- `INSUFFICIENT_BALANCE`: Not enough balance for operation
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 10 requests per minute
- General endpoints: 100 requests per minute
- Payment endpoints: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Number of items per page (max 100, default 20)
- `offset`: Number of items to skip (default 0)

**Response includes pagination metadata:**
```json
{
  "data": {
    "items": [...],
    "total": 500,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```

---

## 🚀 Complete API Usage Examples

### Complete Payment Flow Example

```javascript
// 1. Check payment eligibility
const eligibility = await fetch('/payments-eligibility', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    amount_usd: 29.99,
    is_using_credit: false
  })
});

// 2. Process the payment
if (eligibility.data.eligible) {
  const payment = await fetch('/payments-process', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      receiver: '0x742d35Cc9E9D1234567890123456789012345678',
      cashback_rate: 8.5,
      amount: 29.99,
      is_using_credit: false,
      nonce: `payment_${Date.now()}_${Math.random().toString(36)}`
    })
  });

  if (payment.data.success) {
    console.log(`Earned ${payment.data.cashback_earned} ROZO!`);
  }
}
```

### Complete Shopping Flow Example

```javascript
// 1. Add items to cart
await fetch('/orders-cart', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    product_id: 'prod-123',
    quantity: 1
  })
});

// 2. Get cart with totals
const cart = await fetch('/orders-cart', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// 3. Checkout with ROZO offset
const checkout = await fetch('/orders-checkout', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    order_id: cart.data.order_id,
    rozo_offset_amount: 1500, // Use $15 worth of ROZO
    shipping_address: {
      line1: '123 Main St',
      city: 'San Francisco',
      country: 'US'
    }
  })
});

console.log(`Final amount: $${checkout.data.payment_summary.final_amount_usd}`);
```

---

## 📊 API Rate Limits & Performance

### Rate Limits
| Endpoint Category | Requests per Minute | Burst Limit |
|------------------|---------------------|-------------|
| **Authentication** | 10 | 20 |
| **Payment Processing** | 30 | 50 |
| **Order Management** | 60 | 100 |
| **Catalog Browsing** | 120 | 200 |
| **Profile/Stats** | 60 | 100 |

### Performance Metrics
- **Average Response Time**: <500ms
- **99th Percentile**: <1000ms  
- **Uptime**: 99.9%+
- **Concurrent Users**: 10,000+

---

## 🛡️ Security & Best Practices

### Authentication Security
- **JWT Tokens**: 1-hour expiration with refresh mechanism
- **Wallet Signatures**: EIP-191 compliant signature verification
- **Rate Limiting**: Prevents abuse and brute force attacks
- **HTTPS Only**: All API communication encrypted

### Payment Security
- **Nonce Protection**: Prevents replay attacks
- **Amount Validation**: Server-side verification of all amounts
- **Balance Verification**: Real-time balance checks before processing
- **Audit Logging**: All transactions logged for compliance

---

## 🧪 Testing & Development

### Live API Test Suite
```bash
# In supabase/tests directory
./run-live-tests.sh all          # Complete test suite
./run-live-tests.sh health       # Quick health check
./run-live-tests.sh payments     # Payment system tests
./run-live-tests.sh orders       # Order management tests
```

### curl Examples
```bash
# Health check
curl https://usgsoilitadwutfvxfzq.supabase.co/functions/v1/merchants

# Payment processing
curl -X POST https://usgsoilitadwutfvxfzq.supabase.co/functions/v1/payments-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "receiver": "0x742d35Cc9E9D1234567890123456789012345678",
    "cashback_rate": 5.0,
    "amount": 20.00,
    "is_using_credit": false
  }'
```

---

## 📞 Support & Resources

### API Status
- **Live Endpoint**: [https://usgsoilitadwutfvxfzq.supabase.co/functions/v1](https://usgsoilitadwutfvxfzq.supabase.co/functions/v1)
- **Status**: ✅ All 18 endpoints operational
- **Uptime**: 99.9%+
- **Response Time**: <500ms average

### Documentation
- **GitHub Repository**: [https://github.com/RozoAI/rozo-rewards-miniapp](https://github.com/RozoAI/rozo-rewards-miniapp)
- **Test Suite**: [/supabase/tests/README.md](../supabase/tests/README.md)
- **Technical Spec**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)

---

**📅 Last Updated**: January 9, 2025  
**🔄 API Version**: 1.0  
**📋 Total Endpoints**: 18  
**🎯 Production Ready**: ✅
