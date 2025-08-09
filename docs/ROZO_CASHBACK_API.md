# ROZO Cashback System API Documentation

## Overview
The ROZO cashback system uses $ROZO tokens as the primary cashback currency with a **100:1 conversion rate** to USD.

**Conversion Rate**: `1 ROZO = $0.01 USD` (100 ROZO = $1.00 USD)

## Core Concepts

### 1. ROZO Token System
- **Integer-based**: ROZO tokens are stored as integers (no decimals)
- **USD Conversion**: `rozo_amount / 100 = usd_amount`
- **Example**: 2500 ROZO = $25.00 USD

### 2. Cashback Operations

#### A. **Fetch Balance** - Get current ROZO balance
#### B. **Payment Offset** - Use ROZO to reduce payment amount
#### C. **Cashback Claim** - Earn ROZO from purchases

### 3. Product-Specific Cashback Rates
Each product can have its own cashback rate, overriding the merchant's default rate.

## API Endpoints

### 1. Fetch ROZO Balance

**GET** `/cashback/balance`

Get user's current ROZO cashback balance.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

### 2. Apply ROZO Payment Offset

**POST** `/cashback/apply-offset`

Calculate how ROZO can be used to reduce payment amount.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount_usd": 20.00,
  "rozo_amount": 1000  // Optional: specific ROZO amount to use
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_amount_usd": 20.00,
    "rozo_requested": 1000,
    "rozo_available": 3500,
    "rozo_to_use": 1000,
    "usd_offset": 10.00,
    "final_amount_usd": 10.00,
    "conversion_rate": "1 ROZO = $0.01 USD",
    "savings_percentage": 50.00
  }
}
```

### 3. Claim ROZO Cashback

**POST** `/cashback/claim`

Claim ROZO tokens from a completed purchase.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "transaction_id": "uuid-of-confirmed-transaction",
  "product_id": "uuid-of-purchased-product",
  "amount_usd": 20.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cashback": {
      "id": "uuid",
      "user_id": "uuid",
      "transaction_id": "uuid",
      "type": "purchase_cashback",
      "amount_rozo": 150,
      "amount_usd": 1.50,
      "currency": "ROZO",
      "status": "available",
      "metadata": {
        "product_name": "Premium Access",
        "base_cashback_rate": 5.0,
        "tier_multiplier": 1.5,
        "final_cashback_rate": 7.5
      }
    },
    "amount_rozo": 150,
    "amount_usd": 1.50,
    "base_rate": 5.0,
    "tier_multiplier": 1.5,
    "final_rate": 7.5,
    "user_tier": "gold",
    "conversion_rate": "1 ROZO = $0.01 USD"
  }
}
```

## Products API with Cashback Rates

### Get Products

**GET** `/products`

List products with individual cashback rates.

**Query Parameters:**
- `merchant_id`: Filter by merchant
- `category`: Filter by merchant category
- `search`: Search products by name/description/SKU
- `min_cashback_rate`: Minimum cashback rate filter
- `max_cashback_rate`: Maximum cashback rate filter
- `min_price`: Minimum price filter
- `max_price`: Maximum price filter

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "merchant_id": "uuid",
        "merchant_name": "OpenRouter",
        "merchant_category": "AI",
        "sku": "PREMIUM_ACCESS",
        "name": "Premium Access",
        "description": "Premium access to OpenRouter services",
        "price_usd": 29.99,
        "currency": "USDC",
        "cashback_rate": 8.5,
        "image_url": "https://...",
        "is_active": true
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### Get Product Details

**GET** `/products/{id}`

Get detailed product information with cashback preview for authenticated users.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "merchant_name": "OpenRouter",
    "name": "Premium Access",
    "price_usd": 29.99,
    "cashback_rate": 8.5,
    "cashback_preview": {
      "user_tier": "gold",
      "base_rate": 8.5,
      "tier_multiplier": 1.5,
      "final_rate": 12.75,
      "cashback_usd": 3.82,
      "cashback_rozo": 382,
      "conversion_rate": "1 ROZO = $0.01 USD"
    }
  }
}
```

## Enhanced Payment Flow

### Create Payment Intent with ROZO Offset

**POST** `/payments/create-intent`

Create payment intent with ROZO offset applied.

**Request Body:**
```json
{
  "merchant_id": "uuid",
  "product_id": "uuid",
  "amount": 15.00,
  "original_amount": 25.00,
  "rozo_offset": 1000,
  "currency": "USDC",
  "chain_id": 8453
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_intent_id": "uuid",
    "to_address": "0x...",
    "amount": 15.00,
    "original_amount": 25.00,
    "rozo_offset": 1000,
    "currency": "USDC",
    "chain_id": 8453,
    "cashback_amount": 3.75,
    "cashback_percentage": 15.0,
    "product_info": {
      "id": "uuid",
      "name": "Premium Access",
      "sku": "PREMIUM_ACCESS",
      "cashback_rate": 15.0
    },
    "expires_at": "2024-01-01T00:15:00Z"
  }
}
```

## Complete Purchase Flow Example

### Scenario: User buys $20 product with 5% cashback rate

1. **Check ROZO Balance**
   ```
   GET /cashback/balance
   → Available: 4000 ROZO ($40.00)
   ```

2. **Apply ROZO Offset**
   ```
   POST /cashback/apply-offset
   Body: {"amount_usd": 20.00, "rozo_amount": 1000}
   → Final amount: $10.00 (saved $10.00 with 1000 ROZO)
   ```

3. **Create Payment Intent**
   ```
   POST /payments/create-intent
   Body: {
     "product_id": "uuid",
     "amount": 10.00,
     "original_amount": 20.00,
     "rozo_offset": 1000
   }
   ```

4. **Make Payment** (using RozoPayButton)
   ```
   Pay $10.00 via crypto transaction
   ```

5. **Confirm Payment**
   ```
   POST /payments/{intent_id}/confirm
   Body: {"transaction_hash": "0x..."}
   ```

6. **Claim Cashback**
   ```
   POST /cashback/claim
   Body: {
     "transaction_id": "uuid",
     "product_id": "uuid", 
     "amount_usd": 20.00
   }
   → Earn: 100 ROZO ($1.00) for 5% of $20 original amount
   ```

### Final Result:
- **Paid**: $10.00 (instead of $20.00)
- **Used ROZO**: 1000 ROZO ($10.00)
- **Earned ROZO**: 100 ROZO ($1.00)
- **Net ROZO Change**: -900 ROZO (-$9.00)
- **Total Savings**: $9.00 (45% effective discount)

## Tier System Benefits

| Tier | Multiplier | Example: 5% base rate |
|------|------------|----------------------|
| Bronze | 1.0x | 5% = 100 ROZO per $20 |
| Silver | 1.2x | 6% = 120 ROZO per $20 |
| Gold | 1.5x | 7.5% = 150 ROZO per $20 |
| Platinum | 2.0x | 10% = 200 ROZO per $20 |

## Error Codes

- `INSUFFICIENT_BALANCE`: Not enough ROZO for offset
- `PRODUCT_NOT_FOUND`: Invalid product ID
- `TRANSACTION_NOT_CONFIRMED`: Transaction not confirmed for cashback claim
- `CASHBACK_ALREADY_CLAIMED`: Cashback already claimed for transaction

## Rate Limits

- Cashback operations: 60 requests per minute
- Products API: 100 requests per minute
- Payment operations: 20 requests per minute
