# Order Management API Documentation

## Overview
The Order Management system handles the complete purchase lifecycle from cart to completion, fully integrated with the ROZO cashback system.

## Order Lifecycle States

```
cart → pending → paid → completed
  ↓       ↓        ↓       
cancelled ← -------- ← refunded
```

### State Descriptions
- **`cart`**: Items added to cart, not yet checked out
- **`pending`**: Order created, awaiting payment
- **`paid`**: Payment confirmed, processing order
- **`completed`**: Order fulfilled, cashback available for claiming
- **`cancelled`**: Order cancelled before payment
- **`refunded`**: Order refunded after payment

## API Endpoints

### 1. Shopping Cart Management

#### Get Current Cart
**GET** `/orders/cart`

Get user's current shopping cart.

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "RZ2501099876",
    "status": "cart",
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Premium Access",
        "product_sku": "PREMIUM_ACCESS",
        "unit_price_usd": 29.99,
        "quantity": 1,
        "line_total_usd": 29.99,
        "line_cashback_rozo": 450, 
        "line_cashback_usd": 4.50,
        "cashback_rate": 15.0
      }
    ],
    "totals": {
      "subtotal_usd": 29.99,
      "item_count": 1,
      "total_cashback_rozo": 450,
      "total_cashback_usd": 4.50
    },
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:05:00Z"
  }
}
```

#### Add Item to Cart
**POST** `/orders/cart`

Add product to shopping cart.

**Request Body:**
```json
{
  "product_id": "uuid",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "item_id": "uuid",
    "product_name": "Premium Access",
    "quantity": 2,
    "line_total_usd": 59.98,
    "line_cashback_rozo": 900,
    "final_cashback_rate": 15.0,
    "user_tier": "gold"
  }
}
```

#### Update Cart Item
**PUT** `/orders/cart/{item_id}`

Update quantity of item in cart.

**Request Body:**
```json
{
  "quantity": 3
}
```

#### Remove Item from Cart
**DELETE** `/orders/cart/{item_id}`

Remove specific item from cart.

#### Clear Cart
**DELETE** `/orders/cart`

Remove all items from cart and delete the cart order.

### 2. Checkout Process

#### Proceed to Checkout
**POST** `/orders/checkout`

Convert cart to pending order with ROZO offset applied.

**Request Body:**
```json
{
  "order_id": "uuid",
  "rozo_offset_amount": 1500,
  "shipping_address": {
    "line1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94105",
    "country": "US"
  },
  "payment_method": "crypto",
  "currency": "USDC",
  "chain_id": 8453
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "RZ2501099876",
    "status": "pending",
    "payment_summary": {
      "subtotal_usd": 29.99,
      "rozo_offset_amount": 1500,
      "rozo_offset_usd": 15.00,
      "final_amount_usd": 14.99,
      "savings_percentage": 50.02,
      "total_cashback_rozo": 450,
      "total_cashback_usd": 4.50
    },
    "payment_intent_needed": true,
    "next_steps": [
      "Create payment intent",
      "Complete crypto payment",
      "Confirm payment", 
      "Claim cashback"
    ]
  }
}
```

### 3. Order Management

#### List Orders
**GET** `/orders`

Get user's order history (excludes cart status).

**Query Parameters:**
- `status`: Filter by order status
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_number": "RZ2501099876",
        "status": "completed",
        "subtotal_usd": 29.99,
        "rozo_offset_usd": 15.00,
        "final_amount_usd": 14.99,
        "total_cashback_rozo": 450,
        "item_count": 1,
        "checkout_at": "2024-01-01T10:15:00Z",
        "paid_at": "2024-01-01T10:20:00Z",
        "completed_at": "2024-01-01T10:21:00Z",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Get Order Details
**GET** `/orders/{order_id}`

Get detailed order information including items and status history.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "RZ2501099876", 
    "status": "completed",
    "subtotal_usd": 29.99,
    "rozo_offset_usd": 15.00,
    "final_amount_usd": 14.99,
    "total_cashback_rozo": 450,
    "item_count": 1,
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Premium Access",
        "product_sku": "PREMIUM_ACCESS",
        "unit_price_usd": 29.99,
        "quantity": 1,
        "line_total_usd": 29.99,
        "line_cashback_rozo": 450,
        "cashback_rate": 15.0
      }
    ],
    "payment_details": {
      "payment_intent_id": "uuid",
      "transaction_id": "uuid", 
      "transaction_hash": "0x...",
      "payment_method": "crypto",
      "currency": "USDC",
      "chain_id": 8453
    },
    "addresses": {
      "shipping_address": {
        "line1": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105",
        "country": "US"
      }
    },
    "status_history": [
      {
        "from_status": null,
        "to_status": "cart",
        "reason": "Order created",
        "created_at": "2024-01-01T10:00:00Z"
      },
      {
        "from_status": "cart",
        "to_status": "pending",
        "reason": "User proceeded to checkout",
        "created_at": "2024-01-01T10:15:00Z"
      },
      {
        "from_status": "pending",
        "to_status": "paid",
        "reason": "Payment confirmed",
        "created_at": "2024-01-01T10:20:00Z"
      },
      {
        "from_status": "paid", 
        "to_status": "completed",
        "reason": "Order completed",
        "created_at": "2024-01-01T10:21:00Z"
      }
    ]
  }
}
```

## Complete Purchase Flow Example

### Scenario: Buy $50 worth of products with 4000 ROZO available

#### 1. Add Items to Cart
```bash
POST /orders/cart
{
  "product_id": "prod_1",
  "quantity": 1  # $30 product with 8% cashback
}

POST /orders/cart  
{
  "product_id": "prod_2", 
  "quantity": 1  # $20 product with 5% cashback
}
```

**Cart Result:**
- Subtotal: $50.00
- Expected Cashback: 340 ROZO (varies by user tier)

#### 2. View Cart
```bash
GET /orders/cart
```

**Response:**
- 2 items, $50 total
- 340 ROZO potential cashback

#### 3. Proceed to Checkout
```bash
POST /orders/checkout
{
  "order_id": "cart_order_id",
  "rozo_offset_amount": 2000  # Use $20 worth of ROZO
}
```

**Checkout Result:**
- Original: $50.00
- ROZO Offset: $20.00 (2000 ROZO)
- Final Payment: $30.00
- 60% savings on this order

#### 4. Create Payment Intent
```bash
POST /payments/create-intent
{
  "merchant_id": "merchant_id",
  "amount": 30.00,
  "original_amount": 50.00,
  "rozo_offset": 2000,
  "chain_id": 8453
}
```

#### 5. Complete Payment
```bash
# User pays $30 via RozoPayButton
POST /payments/{intent_id}/confirm
{
  "transaction_hash": "0x..."
}
```

#### 6. Claim Cashback
```bash
POST /cashback/claim
{
  "transaction_id": "uuid",
  "product_id": "prod_1", 
  "amount_usd": 30.00  # First product
}

POST /cashback/claim
{
  "transaction_id": "uuid",
  "product_id": "prod_2",
  "amount_usd": 20.00  # Second product  
}
```

**Final Result:**
- **Paid**: $30.00 (instead of $50.00)
- **ROZO Used**: 2000 ROZO ($20.00)
- **ROZO Earned**: 340 ROZO ($3.40)
- **Net ROZO**: -1660 ROZO (-$16.60)
- **Total Savings**: $16.60 (33.2% effective discount)

## Order Number Format

Order numbers follow the pattern: `RZ{YYMMDD}{NNNN}`

- `RZ`: Prefix for Rozo
- `YYMMDD`: Date (e.g., 250109 for Jan 9, 2025)
- `NNNN`: Random 4-digit number

Example: `RZ2501099876`

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    order_number TEXT UNIQUE,
    status order_status DEFAULT 'cart',
    subtotal_usd DECIMAL(20,6),
    rozo_offset_amount BIGINT DEFAULT 0,
    rozo_offset_usd DECIMAL(20,6) DEFAULT 0,
    final_amount_usd DECIMAL(20,6),
    total_cashback_rozo BIGINT DEFAULT 0,
    payment_intent_id UUID,
    transaction_id UUID,
    -- ... timestamps and metadata
);
```

### Order Items Table
```sql  
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    product_name TEXT,
    unit_price_usd DECIMAL(20,6),
    quantity INTEGER,
    line_total_usd DECIMAL(20,6),
    line_cashback_rozo BIGINT,
    cashback_rate DECIMAL(5,2)
);
```

## Status Transitions

### Valid Transitions
- `cart` → `pending` (checkout)
- `cart` → `cancelled` (abandon cart)
- `pending` → `paid` (payment confirmed)
- `pending` → `cancelled` (cancel before payment)
- `paid` → `completed` (fulfillment complete)
- `paid` → `refunded` (refund issued)
- `completed` → `refunded` (refund issued)

### Automatic Transitions
- Cart items trigger automatic total calculations
- Payment confirmation auto-advances to `paid`
- Cashback becomes claimable when status = `completed`

## Integration with Other Systems

### Payment Integration
- Orders create payment intents for crypto payments
- ROZO offset reduces required payment amount
- Transaction confirmation updates order status

### Cashback Integration  
- Order completion triggers cashback availability
- Product-specific cashback rates from order items
- User tier multipliers applied during order creation

### Inventory Integration (Future)
- Order items can track inventory reservation
- Stock validation during checkout
- Automatic inventory updates on completion
