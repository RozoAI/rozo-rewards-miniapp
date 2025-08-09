# Rozo Rewards MiniApp API Documentation

## Overview
This document describes the REST API endpoints for the Rozo Rewards MiniApp - an AI promo and cashback platform built on Coinbase with Supabase backend.

## Base URL
```
https://your-project.supabase.co/functions/v1
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Data Models

### User
```typescript
interface User {
  id: string;
  wallet_address: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  total_cashback_earned: number;
  total_cashback_claimed: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referral_code: string;
  referred_by?: string;
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

## Authentication

### POST `/auth/wallet-login`
Authenticate user with wallet signature

**Request Body:**
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

## WebSocket Events (Real-time Updates)

Connect to: `wss://your-project.supabase.co/realtime/v1/websocket`

### Events
- `transaction_confirmed`: When a transaction is confirmed on blockchain
- `reward_earned`: When user earns new rewards
- `reward_claimed`: When user claims rewards
- `leaderboard_updated`: When leaderboard positions change

### Example Event:
```json
{
  "event": "reward_earned",
  "payload": {
    "user_id": "string",
    "reward": Reward,
    "transaction": Transaction
  }
}
```
