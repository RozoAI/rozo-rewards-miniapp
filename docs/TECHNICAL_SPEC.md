# Technical Specification - Rozo Rewards MiniApp Backend

## Architecture Overview

### Tech Stack
- **Database**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Supabase Auth + Custom Web3 wallet authentication
- **Real-time**: Supabase Realtime
- **Blockchain Integration**: Viem/Wagmi for Web3 interactions
- **Payment Processing**: Integration with existing RozoPayButton

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Blockchain    │
│   (Next.js)     │───▶│   Edge Functions│───▶│   (Base/ETH)    │
│                 │    │                 │    │                 │
│ - UI Components │    │ - Auth          │    │ - Smart         │
│ - Wallet        │    │ - API Routes    │    │   Contracts     │
│ - RozoPayButton │    │ - Business      │    │ - Transaction   │
│                 │    │   Logic         │    │   Verification  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────▶│   Database      │
                        │   (PostgreSQL)  │
                        │                 │
                        │ - Users         │
                        │ - Merchants     │
                        │ - Transactions  │
                        │ - Rewards       │
                        └─────────────────┘
```

## Database Schema

### Tables

#### `auth.users` (Supabase Auth - Extended)
```sql
-- Extended via profiles table
```

#### `public.profiles`
```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    total_cashback_earned DECIMAL(20,6) DEFAULT 0,
    total_cashback_claimed DECIMAL(20,6) DEFAULT 0,
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.merchants`
```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('AI', 'CRYPTO', 'COMMERCE', 'DOMAIN', 'MARKETING', 'GAMING')),
    description TEXT,
    logo_url TEXT,
    website_url TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    location JSONB, -- {address_line1, address_line2, formatted_address, lat, lon}
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.transactions`
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    transaction_hash TEXT UNIQUE NOT NULL,
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    cashback_amount DECIMAL(20,6) NOT NULL DEFAULT 0,
    cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    to_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.rewards`
```sql
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    type TEXT NOT NULL CHECK (type IN ('cashback', 'referral', 'bonus', 'promotion')),
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'claimed', 'expired')),
    claimed_at TIMESTAMPTZ,
    claim_transaction_hash TEXT,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.payment_intents`
```sql
CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    chain_id INTEGER NOT NULL,
    to_address TEXT NOT NULL,
    cashback_amount DECIMAL(20,6) NOT NULL,
    cashback_percentage DECIMAL(5,2) NOT NULL,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'confirmed', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.referrals`
```sql
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id) NOT NULL,
    referee_id UUID REFERENCES profiles(id) NOT NULL,
    referral_code TEXT NOT NULL,
    bonus_amount DECIMAL(20,6) DEFAULT 0,
    referrer_bonus DECIMAL(20,6) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id)
);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_domain ON merchants(domain);
CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
```

### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own rewards" ON rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payment intents" ON payment_intents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Merchants are publicly readable" ON merchants FOR SELECT TO authenticated USING (is_active = true);
```

## Edge Functions

### Function Structure
```
supabase/functions/
├── auth/
│   ├── wallet-login.ts
│   └── refresh.ts
├── users/
│   ├── profile.ts
│   └── stats.ts
├── merchants/
│   ├── list.ts
│   ├── details.ts
│   └── categories.ts
├── transactions/
│   ├── create.ts
│   ├── list.ts
│   └── verify.ts
├── rewards/
│   ├── list.ts
│   ├── claim.ts
│   └── leaderboard.ts
├── payments/
│   ├── create-intent.ts
│   └── confirm.ts
├── referrals/
│   ├── apply-code.ts
│   └── stats.ts
└── webhooks/
    └── blockchain.ts
```

### Key Implementation Details

#### Authentication Flow
1. **Wallet Signature Verification**:
   ```typescript
   // Verify wallet signature
   const isValidSignature = await verifyMessage({
     address: walletAddress,
     message: authMessage,
     signature: signature
   });
   ```

2. **JWT Token Generation**:
   ```typescript
   // Create Supabase user session
   const { data, error } = await supabaseAdmin.auth.signInWithPassword({
     email: `${walletAddress}@rozo.internal`,
     password: walletAddress
   });
   ```

#### Cashback Calculation
```typescript
function calculateCashback(amount: number, merchantPercentage: number, userTier: string): number {
  const tierMultiplier = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0
  };
  
  return amount * (merchantPercentage / 100) * tierMultiplier[userTier];
}
```

#### Transaction Verification
```typescript
async function verifyTransaction(txHash: string, chainId: number): Promise<TransactionReceipt> {
  const client = createPublicClient({
    chain: chainId === 8453 ? base : mainnet,
    transport: http()
  });
  
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  return receipt;
}
```

## Integration Points

### Frontend Integration
1. **Replace Static JSON with API Calls**:
   - `ai_commerce_catalog.json` → `/merchants` API
   - `coffee_mapdata.json` → `/merchants?category=RESTAURANT` API

2. **Add Authentication Layer**:
   ```typescript
   // utils/supabase.ts
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```

3. **Payment Flow Integration**:
   ```typescript
   // Before payment
   const intent = await createPaymentIntent({ merchantId, amount });
   
   // After payment success
   await confirmPayment(intent.id, { transactionHash });
   ```

### Blockchain Integration
1. **Transaction Monitoring**:
   - Listen for payment confirmations
   - Verify transaction details
   - Update reward status

2. **Reward Distribution**:
   - Batch reward claims
   - Gas optimization
   - Failed transaction handling

## Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- API keys stored in Supabase secrets
- Rate limiting on all endpoints
- Input validation and sanitization

### Web3 Security
- Signature verification for authentication
- Transaction hash validation
- Address validation
- Replay attack prevention

### Access Control
- Row Level Security (RLS) policies
- JWT token validation
- Role-based permissions
- API endpoint authorization

## Performance Optimization

### Database
- Proper indexing for query performance
- Connection pooling
- Query optimization
- Read replicas for analytics

### API
- Response caching
- Pagination for large datasets
- Async processing for heavy operations
- CDN for static assets

### Real-time Features
- WebSocket connections for live updates
- Event-driven architecture
- Efficient data broadcasting
- Connection state management

## Monitoring & Analytics

### Metrics to Track
- Transaction success rates
- Reward claim rates
- User engagement metrics
- Payment processing times
- API response times
- Error rates

### Logging
- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring
- User activity tracking

## Deployment Strategy

### Environment Setup
```bash
# Development
supabase start
supabase db reset
supabase functions serve

# Production
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy
```

### CI/CD Pipeline
1. Code validation and linting
2. Database migration testing
3. Function deployment
4. Integration testing
5. Production deployment

### Environment Variables
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing Strategy

### Unit Tests
- Edge function logic
- Database operations
- Utility functions
- Authentication flows

### Integration Tests
- API endpoint testing
- Database transaction testing
- Blockchain integration testing
- Payment flow testing

### E2E Tests
- Complete user journeys
- Payment processing
- Reward claiming
- Multi-user scenarios
