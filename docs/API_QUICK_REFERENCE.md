# API Quick Reference - ROZO Rewards Lifecycle

## 🚀 TL;DR - 4-Step Complete Flow

```bash
# Setup
export JWT_TOKEN="your_jwt_token"
export BASE_URL="https://usgsoilitadwutfvxfzq.supabase.co/functions/v1"
export MERCHANT="0x8ba1f109551bD432803012645Hac136c4d756e9"

# 1️⃣ Pre-authorize spending
curl -X POST "$BASE_URL/auth-spend-permission" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"authorized": true, "allowance": 1000.00, "daily_limit": 500.00}'

# 2️⃣ Make payment (earn ROZO)
curl -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiver\": \"$MERCHANT\", \"cashback_rate\": 8.5, \"amount\": 29.99, \"is_using_credit\": false}"

# 3️⃣ Check balance
curl -X GET "$BASE_URL/cashback-balance" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 4️⃣ Pay with ROZO
curl -X POST "$BASE_URL/payments-process" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiver\": \"$MERCHANT\", \"amount\": 20.00, \"is_using_credit\": true}"
```

---

## 📋 Key API Endpoints

| Step | Endpoint | Method | Purpose |
|------|----------|---------|---------|
| **Auth** | `/auth-wallet-login` | POST | Get JWT token |
| **Pre-auth** | `/auth-spend-permission` | GET/POST | Setup/check spend permissions |
| **Eligibility** | `/payments-eligibility` | POST | Check payment feasibility |
| **Payment** | `/payments-process` | POST | Execute payment (USDC or ROZO) |
| **Balance** | `/cashback-balance` | GET | Check ROZO balance |
| **Offset** | `/cashback-apply-offset` | POST | Calculate ROZO offset |
| **Cart** | `/orders-cart` | GET/POST | Shopping cart operations |
| **Checkout** | `/orders-checkout` | POST | Checkout with ROZO offset |

---

## 🔑 Critical Parameters

### Payment Process
```json
{
  "receiver": "0x...",           // Merchant wallet (required)
  "amount": 29.99,               // USD amount (required)
  "cashback_rate": 8.5,          // Cashback % (required)
  "is_using_credit": false,      // false=USDC, true=ROZO (required)
  "nonce": "unique_id"           // Replay protection (optional)
}
```

### Spend Permission Setup
```json
{
  "authorized": true,            // Enable permissions (required)
  "allowance": 1000.00,          // Total allowance USD (required)
  "daily_limit": 500.00,         // Daily limit USD (optional)
  "expiry": "2025-02-15T12:00:00Z" // Expiration date (required)
}
```

---

## 💡 Response Key Fields

### Payment Response
```json
{
  "transaction_id": "uuid",
  "payment_method": "direct_usdc|rozo_credit",
  "amount_paid_usd": 29.99,
  "rozo_balance_change": 2549,   // Positive=earned, Negative=used
  "new_rozo_balance": 2549,
  "cashback_earned": 2549,       // Only for USDC payments
  "tx_hash": "0x...",            // Only for USDC payments
  "savings": {...}               // Only for ROZO payments
}
```

### Balance Response
```json
{
  "available_cashback_rozo": 2549,
  "available_cashback_usd": 25.49,
  "current_tier": "bronze",
  "tier_multiplier": 1.0
}
```

---

## ⚡ Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `INSUFFICIENT_BALANCE` | Not enough ROZO | Check balance, use partial payment |
| `SPEND_PERMISSION_EXPIRED` | Authorization expired | Renew spend permission |
| `SPEND_PERMISSION_EXCEEDED` | Over daily limit | Wait for reset or increase limit |
| `INVALID_RECEIVER` | Bad wallet address | Check format (0x + 40 hex chars) |

---

## 🎯 Common Patterns

### Check Before Pay
```bash
# Always check eligibility first
curl -X POST "$BASE_URL/payments-eligibility" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": 25.00, "is_using_credit": true}'

# Then proceed with payment if eligible
```

### Partial ROZO Payment (Shopping Cart)
```bash
# 1. Add to cart
curl -X POST "$BASE_URL/orders-cart" \
  -d '{"product_id": "prod-123", "quantity": 1}'

# 2. Checkout with offset
curl -X POST "$BASE_URL/orders-checkout" \
  -d '{"order_id": "cart_id", "rozo_offset_amount": 1500}'
```

### Error Handling
```bash
RESPONSE=$(curl -s -X POST "$BASE_URL/payments-process" -d '...')
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo "Payment successful!"
else
  ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code')
  echo "Payment failed: $ERROR_CODE"
fi
```

---

## 🔄 ROZO Economics

| Action | ROZO Flow | Formula |
|---------|-----------|---------|
| **Earn** | +ROZO | `payment_amount × cashback_rate × tier_multiplier × 100` |
| **Use** | -ROZO | `usd_amount × 100` (1 ROZO = $0.01) |
| **Offset** | -ROZO | Partial usage in shopping cart |

### Tier Multipliers
- **Bronze**: 1.0x (default)
- **Silver**: 1.2x (after $500 spent)
- **Gold**: 1.5x (after $2,500 spent)  
- **Platinum**: 2.0x (after $10,000 spent)

---

## 🧪 Test Data

```bash
# Test wallets
USER_WALLET="0x742d35Cc9E9D1234567890123456789012345678"
MERCHANT_WALLET="0x8ba1f109551bD432803012645Hac136c4d756e9"

# Test products
OPENROUTER_PREMIUM="prod-openrouter-premium-001"  # $29.99, 8.5% cashback
CIVITAI_PRO="prod-civitai-pro-annual-002"        # $120.00, 12% cashback

# Test amounts
SMALL_PAYMENT=9.99    # Good for testing
MEDIUM_PAYMENT=29.99  # Typical purchase
LARGE_PAYMENT=99.99   # Tier progression
```

---

**🎯 This quick reference covers 90% of use cases. For detailed examples, see [COMPLETE_API_LIFECYCLE.md](./COMPLETE_API_LIFECYCLE.md)**
