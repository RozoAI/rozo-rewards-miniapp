# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start dev server (runs on port 3001)
bun dev

# Build for production
bun build

# Start production server
bun start

# Lint code
bun lint
```

### Testing
```bash
# Run all E2E tests
bun test:e2e

# Run specific test suites
bun test:e2e:auth         # Authentication tests
bun test:e2e:payments     # Payment flow tests
bun test:e2e:orders       # Order management tests
bun test:e2e:quick        # Quick smoke tests
```

### Supabase (Backend)
```bash
# Start local Supabase
supabase start

# Reset database with migrations
supabase db reset

# Deploy all edge functions
supabase functions deploy

# Deploy specific function
supabase functions deploy <function-name>
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19 RC, TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions on Deno)
- **Blockchain**: Multi-chain support (Base, Polygon, BSC, etc.) via Wagmi + Viem
- **Styling**: TailwindCSS v4 with Radix UI components
- **State Management**: TanStack React Query
- **Package Manager**: Bun (v1.2.23)

### Key Architectural Patterns

#### 1. Blockchain Integration Architecture
The app uses a **dual-state blockchain integration** pattern:

- **On-chain State**: Smart contract (CashbackRewards) on Base mainnet manages ROZO points balance and transactions
- **Off-chain State**: Supabase database tracks orders, products, merchants, and user profiles
- **Reconciliation**: E2E tests verify on-chain and off-chain states stay synchronized

**Smart Contract**: `0x1B1129D78C9481da0EEB0bBBf2A484C06371D9eF` (Base mainnet)
- Handles USDC purchases (requires ERC-20 approval)

**Critical Hooks**:
- `useRozoPoints` (src/hooks/useRozoPoints.ts)
  - Auto-switches wallet to Base chain when connected to wrong network
  - Manages USDC approval flow before purchases
- `useRozoWallet` (src/hooks/useRozoWallet.ts)
  - Integrates with Rozo Wallet mobile app via `window.rozo` provider
  - Handles Stellar USDC transfers (gasless via OpenZeppelin Relayer)
  - Dynamically imports Stellar SDK to avoid SSR issues
  - Converts between USD and Stellar stroops (7 decimals)

#### 2. Multi-Provider Web3 Architecture
Located in `src/providers/Web3Provider.tsx` and `src/lib/appkit.ts`:

```typescript
// Provider hierarchy:
WagmiProvider → QueryClientProvider → AppKitProvider → App

// Supported networks (9 chains):
- Base (default), Polygon, BSC, Ethereum Mainnet
- Arbitrum, Avalanche, Gnosis, Optimism, Worldchain

// Wallet connectors:
- Injected wallets (MetaMask, Rainbow, etc.)
- Farcaster social auth
- WalletConnect v2
```

**Important**: AppKit is initialized once in `initializeAppKit()` and cached globally to prevent duplicate modal instances.

#### 3. Supabase Edge Functions Structure
All API logic lives in `supabase/functions/`:

```
supabase/functions/
├── _shared/           # Shared utilities and types
│   ├── types.ts       # TypeScript interfaces
│   └── utils.ts       # CORS, auth helpers
├── auth-wallet-login/ # Wallet-based authentication
├── cashback-*/        # Cashback system (balance, claim, apply-offset)
├── orders-*/          # Shopping cart & checkout
├── payments-*/        # Payment intent creation & processing
├── products-*/        # Product catalog
└── merchants-*/       # Merchant management
```

**Authentication Flow**:
- Edge functions use Supabase JWT auth
- Wallet login creates/updates user profile with wallet address
- All endpoints validate `Authorization: Bearer <token>` header

#### 4. Payment Flow

1. User selects merchant/product
2. Pay via USDC (RozoPayButton component) or Rozo Wallet (Stellar)
3. Payment confirmed on-chain

**Database Schema**:
- `profiles`: User wallet address and balance
- `orders`: Shopping cart & order history
- `order_items`: Individual products in orders
- `merchants`: Merchant catalog
- `products`: SKUs per merchant

#### 5. Route Groups & Layouts

The app has three isolated route groups, each with its own layout:

| Route Group | Path | Layout | Purpose |
|-------------|------|---------|---------|
| `(landing)` | `/` | Minimal, no Web3 | Public landing page |
| `(dapp-merchants)` | `/merchants` | Lightweight, no Web3 | Merchant dApp embedded in Rozo Wallet |
| `(main)` | all other routes | Full Web3 + Supabase auth | Discovery, payments, profile |

#### 6. Routing & URL Changes

**Permanent redirect** (`next.config.ts`):
```
/dapp → /merchants (301)
```

**Middleware** (`src/middleware.ts`):
```
/restaurant/:id → /ns/[handle] (301)
```
Middleware validates the `_id` exists in `LOCATIONS` (with `is_live: true`) before redirecting. Non-matching requests pass through.

**Current merchant URL pattern**: `/ns/[handle]` (e.g. `/ns/nscafe`)

**Removed routes**:
- `/lifestyle` — page deleted
- `/api/merchants` — replaced by `src/lib/api.ts`
- `/api/dappapi` — replaced by `src/lib/api.ts`

#### 7. Payment Methods Integration
The merchant detail page (`src/app/(main)/ns/[handle]/page.tsx`) supports **three payment methods**:

**Payment Priority**:
1. **Pay with Rozo Wallet** (when `window.rozo` is available)
   - Only shown in Rozo Wallet mobile app webview
   - Uses Stellar USDC transfers (gasless via OpenZeppelin Relayer)
   - Replaces crypto and points buttons when available

2. **Pay with Crypto** (fallback when Rozo Wallet not available)
   - Multi-chain support via RozoPayButton
   - Base USDC payment

**Conditional Rendering Logic**:
```typescript
{isRozoWalletAvailable && isRozoWalletConnected ? (
  <RozoWalletButton /> // Single payment option
) : (
  <CryptoPaymentButton />
)}
```

**Key Files**:
- `src/types/window.d.ts`: TypeScript definitions for `window.rozo` provider
- `src/hooks/useRozoWallet.ts`: Rozo Wallet integration hook
- `src/app/(main)/ns/[handle]/page.tsx`: Payment UI implementation
- `src/middleware.ts`: Legacy `/restaurant/:id` redirect

## Code Style Guidelines

### From Cursor Rules (.cursor/rules/nextjs.mdc)

**Code Structure**:
- Use functional components with TypeScript (no classes)
- Minimize `'use client'` directives—prefer React Server Components
- Structure files: exports → subcomponents → helpers → types
- Use lowercase-with-dashes for directories (e.g., `ai-services/`)

**State & Data Fetching**:
- Use TanStack React Query for server state
- Avoid excessive `useEffect` and `setState`
- Implement dynamic imports for code splitting

**Error Handling**:
- Use early returns for error conditions
- Implement guard clauses for preconditions
- Create custom error types for consistency

**Performance**:
- Optimize images (WebP, lazy loading, size data)
- Mobile-first responsive design
- Minimize client-side JavaScript

## Important Configuration

### Path Aliases
```typescript
// tsconfig.json
"@/*": ["./src/*"]  // Import from src/ as @/
```

### Environment Variables
Required for development:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Optional
INTERCOM_APP_ID=
```

### Git Hooks (Lefthook)
Pre-commit hook runs ESLint on staged TypeScript files:
```bash
# Auto-installed via: bun prepare
lefthook install
```

### Next.js Configuration
- Dev server runs on **port 3001** (not 3000)
- Webpack configured to ignore Node.js modules (fs, net, tls)
- Dev indicators disabled
- Permanent redirect: `/dapp` → `/merchants`
- Remote image hostnames: `mugglespublicweb.s3.ap-southeast-1.amazonaws.com`, `imagedelivery.net`, `cdn1.npcdn.net`, `ns.com`, `www.rozo.ai`

## Common Patterns

### Wallet Connection Check
```typescript
const { address, isConnected } = useAppKitAccount();
const chainId = useChainId();
const isOnBaseChain = chainId === 8453;

// Auto-switch to Base if needed
useEffect(() => {
  if (isConnected && !isOnBaseChain) {
    switchToBase();
  }
}, [isConnected, isOnBaseChain]);
```

### API Calls to Supabase Functions
```typescript
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${SUPABASE_URL}/functions/v1/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

## Critical Files Reference

### Core Configuration
- `src/lib/appkit.ts` - Web3 wallet configuration (9 chains)
- `src/lib/contracts.ts` - Smart contract ABI & address
- `src/wagmi.ts` - (Commented out, using appkit.ts instead)

### Key Hooks
- `src/hooks/useRozoPoints.ts` - On-chain balance & USDC approval
- `src/hooks/useRozoAPI.ts` - API client for Supabase functions
- `src/hooks/useCDPPermissions.ts` - Coinbase CDP permissions
- `src/hooks/useUSDCBalance.ts` - USDC token balance

### Providers
- `src/providers/Web3Provider.tsx` - Wagmi + AppKit setup (used in `(main)`)
- `src/providers/Web3ProviderMiniApp.tsx` - Lightweight provider for miniapp contexts
- `src/providers/landing-providers.tsx` - Minimal providers for `(landing)` route group
- `src/providers/MiniKitProvider.tsx` - Farcaster MiniKit integration

### API Routes
- `src/app/(main)/api/webhook/route.ts` - Payment webhooks
- `src/app/(main)/api/notify/route.ts` - Notifications

### Merchant Data
- `src/lib/api.ts` - Merchant API client (fetches from external Rozo API)
- `src/lib/data.ts` - `LOCATIONS` static array with `_id`, `handle`, `is_live` fields
- `src/lib/restaurants.ts` - Restaurant/merchant helper utilities
- `src/middleware.ts` - Redirects `/restaurant/:id` → `/ns/[handle]` (301)

## Testing Notes

### E2E Test Structure
Located in `tests/e2e/`:
- `auth-tests.ts` - Wallet login & session management
- `payment-tests.ts` - USDC purchase flows
- `order-tests.ts` - Shopping cart & checkout flow
- `main-test-suite.ts` - Full integration tests

**Test Configuration**: `tests/e2e/test-config.ts`
- Requires `.env` file in `tests/e2e/` directory
- Tests run against production Supabase instance
- Uses real wallet addresses for on-chain verification

### Running Tests
Tests are sequential (not parallel) to avoid race conditions in order state:
```bash
# Full suite (~5-10 minutes)
bun test:e2e

# Quick smoke test (~30 seconds)
bun test:e2e:quick
```

## Documentation

Comprehensive API docs in `docs/`:
- `API.md` - Complete endpoint reference
- `ROZO_CASHBACK_API.md` - Cashback system details
- `ORDER_MANAGEMENT_API.md` - Shopping cart & orders
- `TECHNICAL_SPEC.md` - Technical implementation details
- `openapi.yaml` - OpenAPI 3.0 specification
- `COMPLETE_API_LIFECYCLE.md` - Step-by-step tutorial with curl examples

## Common Tasks

### Adding a New Supabase Function
1. Create directory: `supabase/functions/my-function/`
2. Add `index.ts` with Deno.serve handler
3. Import shared utilities from `_shared/`
4. Deploy: `supabase functions deploy my-function`

### Adding a New Smart Contract Function
1. Update ABI in `src/lib/contracts.ts`
2. Add read/write hooks in `src/hooks/useRozoPoints.ts`
3. Add UI interaction in relevant component
4. Test on-chain interaction via E2E tests

### Debugging Wallet Issues
- Check network: Must be on Base (chainId: 8453)
- Check USDC approval: `usdcAllowance` in useRozoPoints
- Check contract balance: `getContractUSDCBalance()` view function
- Verify wallet signature: Check browser console for rejection errors

### Debugging API Issues
- Check Supabase logs: `supabase functions logs <function-name>`
- Verify JWT token: Decode token at jwt.io
- Check CORS: All functions use `corsHeaders` from `_shared/utils.ts`
- Test locally: `supabase functions serve <function-name>`
