# Complete API Request Lifecycle Guide

## 🎯 Overview
This guide walks you through the complete user journey in the Rozo Rewards system, from initial setup to making payments with cashback. Follow this step-by-step tutorial to understand the full API lifecycle.

**What you'll learn:**
1. **Pre-Authorization Setup** - Enable one-tap payments
2. **First Payment** - Make payment and earn ROZO cashback
3. **Balance Verification** - Check earned cashback
4. **Cashback Payment** - Use ROZO credits for payments

---

## 🚀 Prerequisites

### 1. Authentication
First, you need to authenticate with your wallet:

```bash
# Get JWT token via wallet signature
curl -X POST "https://usgsoilitadwutfvxfzq.supabase.co/functions/v1/auth-wallet-login" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x742d35Cc9E9D1234567890123456789012345678",
    "signature": "0x1234567890abcdef...",
    "message": "Sign this message to authenticate with Rozo Rewards"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_abc123def456",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wallet_address": "0x742d35Cc9E9D1234567890123456789012345678",
      "total_cashback_rozo": 0,
      "current_tier": "bronze"
    },
    "expires_in": 3600
  }
}
```

🔑 **Save the `access_token`** - you'll use it in all subsequent requests as:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 **STEP 1: Get Pre-Permission (CDP Spend Authorization)**

### 1.1 Check Current Authorization Status

```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export BASE_URL="https://usgsoilitadwutfvxfzq.supabase.co/functions/v1"

curl -X GET "$BASE_URL/auth-spend-permission" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (New User - No Permission Yet):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "authorized": false,
    "allowance": 0,
    "status": "not_configured",
    "recommendations": [
      "Set up spend permission to enable one-tap payments",
      "Recommended allowance: $1,000 for optimal experience"
    ]
  }
}
```

### 1.2 Set Up Spend Permission

```bash
curl -X POST "$BASE_URL/auth-spend-permission" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "authorized": true,
    "allowance": 1000.00,
    "daily_limit": 500.00,
    "expiry": "2025-02-15T12:00:00Z",
    "signature": "0x1234567890abcdef...",
    "permission_id": "perm_abc123def456"
  }'
```

**Response (Permission Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "authorized": true,
    "allowance": 1000.00,
    "daily_limit": 500.00,
    "expiry": "2025-02-15T12:00:00Z",
    "status": "active",
    "updated_at": "2025-01-09T10:45:00Z",
    "recommendations": [
      "✅ Spend permission successfully configured",
      "✅ You can now make one-tap payments up to $500/day",
      "✅ Valid for 37 days"
    ]
  }
}
```

### 1.3 Verify Permission is Active

```bash
curl -X GET "$BASE_URL/auth-spend-permission" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response (Active Permission):**
```json
{
  "success": true,
  "data": {
    "authorized": true,
    "allowance": 1000.00,
    "daily_limit": 500.00,
    "remaining_today": 500.00,  // Full daily limit available
    "expiry": "2025-02-15T12:00:00Z",
    "status": "active",
    "usage_stats": {
      "total_used": 0.00,
      "transactions_count": 0
    }
  }
}
```

✅ **Pre-authorization is now complete!** Users can make one-tap payments up to $500/day.

---

## 💳 **STEP 2: Make First Payment (Earn ROZO Cashback)**

### 2.1 Check Payment Eligibility

Before making any payment, check if it's eligible:

```bash
curl -X POST "$BASE_URL/payments-eligibility" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usd": 29.99,
    "is_using_credit": false
  }'
```

**Response (Eligible for Payment):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "payment_method": "direct_usdc",
    "allowance_remaining": 1000.00,
    "spend_permission": {
      "authorized": true,
      "expires_at": "2025-02-15T12:00:00Z",
      "daily_limit": 500.00,
      "remaining_today": 500.00
    },
    "cashback_preview": {
      "base_rate": 8.5,
      "user_tier": "bronze",
      "tier_multiplier": 1.0,
      "final_rate": 8.5,
      "estimated_rozo": 2549,
      "estimated_usd": 25.49
    },
    "recommendations": [
      "✅ Payment authorized via CDP Spend Permissions",
      "✅ You'll earn 2,549 ROZO ($25.49) from this purchase",
      "✅ Bronze tier gives you 1x cashback multiplier"
    ]
  }
}
```

### 2.2 Execute Payment (Earn Cashback)

```bash
curl -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "0x8ba1f109551bD432803012645Hac136c4d756e9",
    "cashback_rate": 8.5,
    "amount": 29.99,
    "is_using_credit": false,
    "auto_execute": true,
    "nonce": "payment_20250109_first_purchase_001"
  }'
```

**Response (Successful Payment):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440123",
    "payment_method": "direct_usdc",
    "amount_paid_usd": 29.99,
    "rozo_balance_change": 2549,
    "new_rozo_balance": 2549,
    "cashback_earned": 2549,
    "tx_hash": "0xabc123def456789012345678901234567890abcdef",
    "cashback_details": {
      "base_rate": 8.5,
      "user_tier": "bronze",
      "tier_multiplier": 1.0,
      "final_rate": 8.5,
      "calculation": "29.99 × 8.5% × 1.0 = $25.49 = 2549 ROZO"
    },
    "spend_permission_used": {
      "amount_deducted": 29.99,
      "remaining_allowance": 970.01,
      "remaining_daily": 470.01
    },
    "execution_time_ms": 1250,
    "timestamp": "2025-01-09T11:30:00Z"
  }
}
```

🎉 **Success!** You've made your first payment and earned **2,549 ROZO** ($25.49 in cashback)!

**Key Points:**
- **Amount Paid**: $29.99 from your wallet
- **ROZO Earned**: 2,549 ROZO (equivalent to $25.49)
- **Effective Cashback**: 85% return on investment!
- **Tier**: Bronze (1x multiplier)

---

## 🪙 **STEP 3: Check Your ROZO Cashback Balance**

### 3.1 Get Comprehensive Balance Information

```bash
curl -X GET "$BASE_URL/cashback-balance" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response (After First Payment):**
```json
{
  "success": true,
  "data": {
    "balance_summary": {
      "total_cashback_rozo": 2549,
      "available_cashback_rozo": 2549,
      "used_cashback_rozo": 0,
      "pending_cashback_rozo": 0,
      "total_cashback_usd": 25.49,
      "available_cashback_usd": 25.49,
      "used_cashback_usd": 0.00,
      "pending_cashback_usd": 0.00
    },
    "tier_info": {
      "current_tier": "bronze",
      "tier_multiplier": 1.0,
      "total_earned_usd": 29.99,
      "next_tier": "silver",
      "next_tier_requirement": 500.00,
      "progress_to_next": 6.0
    },
    "recent_activity": [
      {
        "type": "earned",
        "amount_rozo": 2549,
        "amount_usd": 25.49,
        "source": "Purchase payment",
        "date": "2025-01-09T11:30:00Z",
        "status": "available",
        "transaction_id": "550e8400-e29b-41d4-a716-446655440123"
      }
    ],
    "earning_potential": {
      "next_purchase_multiplier": 1.0,
      "estimated_monthly_earning": 2549,
      "personalized_tips": [
        "Great start! You've earned your first ROZO cashback",
        "You're 6% of the way to Silver tier (1.2x multiplier)",
        "Make more purchases to unlock higher tier benefits"
      ]
    }
  }
}
```

### 3.2 Quick Balance Check

For a simple balance check:

```bash
curl -X GET "$BASE_URL/users-profile" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response (Quick Profile with Balance):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wallet_address": "0x742d35Cc9E9D1234567890123456789012345678",
      "current_tier": "bronze"
    },
    "rozo_account": {
      "total_cashback_rozo": 2549,
      "available_cashback_rozo": 2549,
      "lifetime_earned_usd": 29.99,
      "current_tier": "bronze",
      "tier_progress": {
        "current_requirements": 0.00,
        "next_tier_requirements": 500.00,
        "progress_percentage": 6.0
      }
    }
  }
}
```

💰 **Balance Confirmed**: You have **2,549 ROZO** available (worth $25.49)!

---

## 🎯 **STEP 4: Make Payment Using ROZO Cashback**

Now let's use your earned ROZO to pay for another purchase!

### 4.1 Calculate Optimal ROZO Offset

First, see how much ROZO you want to use:

```bash
curl -X POST "$BASE_URL/cashback-apply-offset" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usd": 50.00,
    "rozo_amount": 2000
  }'
```

**Response (Offset Calculation):**
```json
{
  "success": true,
  "data": {
    "calculation": {
      "original_amount_usd": 50.00,
      "rozo_to_use": 2000,
      "usd_offset": 20.00,
      "final_amount_usd": 30.00,
      "savings_percentage": 40.00,
      "effective_discount_rate": 40.00
    },
    "balance_impact": {
      "current_balance": 2549,
      "after_offset": 549,
      "percentage_used": 78.47
    },
    "optimization": {
      "is_optimal": true,
      "alternatives": [
        {
          "rozo_amount": 1000,
          "usd_offset": 10.00,
          "final_amount": 40.00,
          "savings": 20.00,
          "recommendation": "Conservative option - save more ROZO"
        },
        {
          "rozo_amount": 2549,
          "usd_offset": 25.49,
          "final_amount": 24.51,
          "savings": 50.98,
          "recommendation": "Maximum savings - use all ROZO!"
        }
      ],
      "recommendations": [
        "40% offset provides good balance of savings and ROZO conservation",
        "You'll still have 549 ROZO remaining for future purchases",
        "Consider the maximum option for biggest savings"
      ]
    }
  }
}
```

### 4.2 Check Eligibility for ROZO Payment

```bash
curl -X POST "$BASE_URL/payments-eligibility" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usd": 50.00,
    "is_using_credit": true
  }'
```

**Response (Eligible for Full ROZO Payment):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "payment_method": "rozo_credit",
    "rozo_cost": 5000,
    "remaining_balance": -2451,  // Not enough for full payment
    "shortfall": 2451,
    "alternatives": [
      {
        "method": "direct_usdc",
        "eligible": true,
        "description": "Pay with USDC and earn ROZO cashback"
      },
      {
        "method": "partial_rozo",
        "eligible": true,
        "description": "Use 2,549 ROZO + $24.51 USDC",
        "rozo_amount": 2549,
        "usdc_amount": 24.51
      }
    ],
    "recommendations": [
      "Not enough ROZO for full payment",
      "Consider partial ROZO payment for maximum savings",
      "Or pay with USDC to earn more ROZO"
    ]
  }
}
```

### 4.3 Option A: Use Shopping Cart with ROZO Offset

Let's use the order system for partial ROZO payment:

#### Add Product to Cart:
```bash
curl -X POST "$BASE_URL/orders-cart" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod-civitai-pro-annual-002",
    "quantity": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "item_added": {
      "id": "item-1",
      "product_name": "Civitai Pro Annual Subscription",
      "quantity": 1,
      "unit_price_usd": 120.00,
      "line_total_usd": 120.00,
      "cashback_rate": 12.0,
      "line_cashback_rozo": 1440
    },
    "cart_summary": {
      "items_count": 1,
      "subtotal_usd": 120.00,
      "total_cashback_rozo": 1440
    }
  }
}
```

#### Get Cart Details:
```bash
curl -X GET "$BASE_URL/orders-cart" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Checkout with ROZO Offset:
```bash
curl -X POST "$BASE_URL/orders-checkout" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER_ID_FROM_CART",
    "rozo_offset_amount": 2549,
    "shipping_address": {
      "line1": "123 Main Street",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94105",
      "country": "US"
    },
    "delivery_notes": "Using all my earned ROZO!"
  }'
```

**Response (Checkout with ROZO Offset):**
```json
{
  "success": true,
  "data": {
    "order_number": "RZ2501099876",
    "status": "pending",
    "payment_summary": {
      "subtotal_usd": 120.00,
      "rozo_offset_amount": 2549,
      "rozo_offset_usd": 25.49,
      "final_amount_usd": 94.51,
      "tax_amount_usd": 0.00,
      "fee_amount_usd": 0.00,
      "total_due_usd": 94.51,
      "savings_percentage": 21.24,
      "total_cashback_rozo": 1440,
      "total_cashback_usd": 14.40
    },
    "rozo_transaction": {
      "rozo_used": 2549,
      "usd_value": 25.49,
      "remaining_balance": 0,
      "all_rozo_used": true
    },
    "next_steps": [
      "Complete payment of $94.51 via blockchain transaction",
      "You used all your ROZO for maximum savings!",
      "You'll earn 1,440 new ROZO from this purchase"
    ],
    "checkout_expires_at": "2025-01-09T14:00:00Z"
  }
}
```

### 4.4 Option B: Direct ROZO Credit Payment (Smaller Amount)

For a smaller amount that you can fully pay with ROZO:

```bash
curl -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "0x8ba1f109551bD432803012645Hac136c4d756e9",
    "cashback_rate": 15.0,
    "amount": 20.00,
    "is_using_credit": true,
    "nonce": "payment_20250109_rozo_credit_001"
  }'
```

**Response (Full ROZO Credit Payment):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440456",
    "payment_method": "rozo_credit",
    "amount_paid_usd": 0.00,
    "rozo_balance_change": -2000,
    "new_rozo_balance": 549,
    "internal_payment": true,
    "savings": {
      "rozo_used": 2000,
      "usd_equivalent": 20.00,
      "effective_discount": "100%"
    },
    "merchant_payment": {
      "platform_paid_merchant": 20.00,
      "source": "rozo_treasury"
    },
    "execution_time_ms": 450,
    "timestamp": "2025-01-09T12:15:00Z"
  }
}
```

🎉 **Amazing!** You just paid **$20 entirely with ROZO credits**!

**Key Points:**
- **Your Cost**: $0 (paid with ROZO)
- **ROZO Used**: 2,000 ROZO
- **Remaining ROZO**: 549 ROZO
- **Merchant Received**: $20 (paid by platform from treasury)
- **You Saved**: 100% of the purchase price!

---

## 📊 **Final Balance Check**

Let's verify your updated balance:

```bash
curl -X GET "$BASE_URL/cashback-balance" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response (After Using ROZO):**
```json
{
  "success": true,
  "data": {
    "balance_summary": {
      "total_cashback_rozo": 2549,
      "available_cashback_rozo": 549,
      "used_cashback_rozo": 2000,
      "total_cashback_usd": 25.49,
      "available_cashback_usd": 5.49,
      "used_cashback_usd": 20.00
    },
    "recent_activity": [
      {
        "type": "used",
        "amount_rozo": -2000,
        "amount_usd": -20.00,
        "source": "ROZO credit payment",
        "date": "2025-01-09T12:15:00Z",
        "status": "completed"
      },
      {
        "type": "earned",
        "amount_rozo": 2549,
        "amount_usd": 25.49,
        "source": "Purchase payment",
        "date": "2025-01-09T11:30:00Z",
        "status": "available"
      }
    ],
    "tier_info": {
      "current_tier": "bronze",
      "total_earned_usd": 29.99,
      "progress_to_next": 6.0
    }
  }
}
```

---

## 🎯 **Complete Lifecycle Summary**

### **What You Accomplished:**

1. ✅ **Set Up Pre-Authorization**
   - Configured CDP Spend Permissions
   - Enabled one-tap payments up to $500/day

2. ✅ **Made First Payment**
   - Paid $29.99 for a product
   - Earned 2,549 ROZO ($25.49 cashback)
   - 85% effective cashback rate!

3. ✅ **Verified Cashback**
   - Checked balance: 2,549 ROZO available
   - Understood tier progression (6% to Silver)

4. ✅ **Used ROZO for Payment**
   - Paid $20 entirely with ROZO credits
   - Saved 100% on the purchase
   - Platform paid merchant from treasury

### **Your Current Status:**
- **ROZO Balance**: 549 ROZO ($5.49)
- **Total Earned**: $25.49 in cashback
- **Total Saved**: $20.00 in ROZO payments
- **Tier**: Bronze (6% progress to Silver)
- **Spend Permission**: Active ($470.01 remaining today)

### **Next Steps:**
- Continue making purchases to reach Silver tier (1.2x multiplier)
- Accumulate more ROZO for larger savings
- Enjoy seamless one-tap payments!

---

## 🚀 **Complete Test Script**

Here's a complete bash script that runs the entire lifecycle:

```bash
#!/bin/bash

# Configuration
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"
BASE_URL="https://usgsoilitadwutfvxfzq.supabase.co/functions/v1"
MERCHANT_ADDRESS="0x8ba1f109551bD432803012645Hac136c4d756e9"

echo "🚀 ROZO REWARDS COMPLETE API LIFECYCLE TEST"
echo "============================================"

echo -e "\n🔐 STEP 1: Setting up pre-authorization..."
curl -s -X POST "$BASE_URL/auth-spend-permission" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "authorized": true,
    "allowance": 1000.00,
    "daily_limit": 500.00,
    "expiry": "2025-02-15T12:00:00Z",
    "signature": "0x1234567890abcdef..."
  }' | jq '.data | {status, allowance, daily_limit}'

echo -e "\n💳 STEP 2: Making first payment (earn ROZO)..."
FIRST_PAYMENT=$(curl -s -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"receiver\": \"$MERCHANT_ADDRESS\",
    \"cashback_rate\": 8.5,
    \"amount\": 29.99,
    \"is_using_credit\": false,
    \"nonce\": \"payment_lifecycle_test_1_$(date +%s)\"
  }")

echo "$FIRST_PAYMENT" | jq '.data | {amount_paid_usd, cashback_earned, new_rozo_balance}'

echo -e "\n🪙 STEP 3: Checking ROZO balance..."
curl -s -X GET "$BASE_URL/cashback-balance" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.balance_summary'

echo -e "\n🧮 STEP 4: Calculating ROZO offset..."
curl -s -X POST "$BASE_URL/cashback-apply-offset" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usd": 20.00,
    "rozo_amount": 2000
  }' | jq '.data.calculation'

echo -e "\n💰 STEP 5: Making payment with ROZO credits..."
curl -s -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"receiver\": \"$MERCHANT_ADDRESS\",
    \"cashback_rate\": 15.0,
    \"amount\": 20.00,
    \"is_using_credit\": true,
    \"nonce\": \"payment_lifecycle_test_2_$(date +%s)\"
  }" | jq '.data | {payment_method, rozo_balance_change, new_rozo_balance, savings}'

echo -e "\n📊 FINAL: Updated balance..."
curl -s -X GET "$BASE_URL/cashback-balance" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.balance_summary'

echo -e "\n🎉 COMPLETE LIFECYCLE TEST FINISHED!"
echo "You've successfully completed the entire ROZO Rewards journey!"
```

Save this as `complete-lifecycle-test.sh`, make it executable (`chmod +x complete-lifecycle-test.sh`), and run it with your JWT token to test the entire flow!

---

**🎯 This guide demonstrates the complete power of the ROZO Rewards system - from earning cashback to using it for future purchases!**
