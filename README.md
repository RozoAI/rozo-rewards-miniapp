# Rozo Rewards MiniApp

A stablecoin payment platform for merchants, built on Base.

## Overview

Rozo Rewards lets users:
- **Discover merchants** via a dedicated landing page and dApp surface
- **Pay with USDC** across multiple chains or via Rozo Wallet (Stellar)

## Screenshots
| Discovery | Landing | Profile |
|---|---|---|
| <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/e66d2bb1-8dcb-40bd-a812-6e7e310f4f8d" /> | <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/9f21188b-196a-4b71-a8f5-87a05e553676" /> | <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/a3f333e9-b2d0-4337-b32a-957d275e87a3" /> |

## Key Features

### Merchant Discovery
- **Landing Page**: Public-facing page at `/` with app store download links
- **Merchants dApp**: Embedded surface at `/merchants` (inside Rozo Wallet)
- **Namespace Routes**: Merchant detail pages at `/ns/[handle]` (e.g. `/ns/nscafe`)
- **AI Services**: Separate catalog at `/ai-services/[domain]`

### Payment Methods
1. **Rozo Wallet** (`window.rozo`) — Stellar USDC, gasless, only in mobile webview
2. **Crypto** — USDC via RozoPayButton, multi-chain

## Route Changes (this branch vs main)

| Before | After | Notes |
|--------|-------|-------|
| `/dapp` | `/merchants` | Permanent 301 redirect via `next.config.ts` |
| `(dapp)/` route group | `(dapp-merchants)/` route group | Isolated layout, no Web3 providers |
| `/restaurant/[id]` | `/ns/[handle]` | Handle-based URLs; middleware 301 redirects old IDs |
| `/lifestyle` | removed | Page deleted |
| `(main)/` (all routes) | `(main)/` + `(landing)/` | Landing page split into own route group |
| `/api/merchants`, `/api/dappapi` | removed | Logic moved to `src/lib/api.ts` |

### Middleware (`src/middleware.ts`)
Handles legacy `/restaurant/:id` → `/ns/:handle` redirects (301) by looking up `_id` in `LOCATIONS` data.

```ts
// Matches: /restaurant/:id*
// Redirects to: /ns/[handle] if merchant found and is_live
```

### Next.js Permanent Redirect
```ts
// next.config.ts
{ source: "/dapp", destination: "/merchants", permanent: true }
```

## Project Structure

```
src/
├── app/
│   ├── (landing)/          # Public landing page (isolated layout, no Web3)
│   │   └── page.tsx        # Hero, merchant preview, app store links
│   ├── (dapp-merchants)/   # Merchants dApp surface (isolated layout)
│   │   └── merchants/      # /merchants route
│   ├── (main)/             # Main app (Web3 + Supabase auth)
│   │   ├── ns/[handle]/    # Merchant detail pages (was /restaurant/[id])
│   │   ├── ai-services/    # AI services catalog
│   │   ├── discovery/      # Map-based discovery
│   │   ├── profile/        # User profile
│   │   ├── receipt/        # Payment receipts
│   │   └── pay/            # Payment flow
│   └── globals.css
├── components/
│   ├── landing/            # Landing page components
│   ├── restaurant/         # Merchant detail + payment components
│   ├── dapp/               # Merchants dApp components
│   └── ai-services/        # AI services components
├── lib/
│   ├── api.ts              # Merchant API client (replaces removed API routes)
│   ├── data.ts             # LOCATIONS static merchant data
│   └── restaurants.ts      # Restaurant/merchant helpers
├── middleware.ts            # Legacy /restaurant/:id redirect
└── providers/
    ├── Web3Provider.tsx
    ├── Web3ProviderMiniApp.tsx
    └── landing-providers.tsx
```

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **TailwindCSS v4** + Radix UI
- **Supabase** (PostgreSQL + Edge Functions)
- **Wagmi/Viem** + AppKit (WalletConnect v2)
- **Bun** (package manager + runtime)

## Getting Started

### Prerequisites
- Bun v1.2+
- Docker (for local Supabase)

### Installation

```bash
git clone https://github.com/your-org/rozo-rewards-miniapp.git
cd rozo-rewards-miniapp
bun install
cp example.env .env.local
# fill in .env.local
bun dev  # runs on port 3001
```

### Local Supabase (optional)
```bash
supabase start
supabase db reset
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# App
NEXT_PUBLIC_URL=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=

# Optional
INTERCOM_APP_ID=
```

## Commands

```bash
bun dev          # dev server (port 3001)
bun build        # production build
bun start        # production server
bun lint         # ESLint

# E2E tests
bun test:e2e
bun test:e2e:auth
bun test:e2e:payments
bun test:e2e:orders
bun test:e2e:quick

# Supabase
supabase start
supabase db reset
supabase functions deploy
supabase functions deploy <function-name>
```

## API Documentation

- [`docs/API.md`](./docs/API.md) — Complete endpoint reference
- [`docs/ORDER_MANAGEMENT_API.md`](./docs/ORDER_MANAGEMENT_API.md) — Orders & cart
- [`docs/TECHNICAL_SPEC.md`](./docs/TECHNICAL_SPEC.md) — Technical implementation
- [`docs/openapi.yaml`](./docs/openapi.yaml) — OpenAPI 3.0 spec

## Deployment

```bash
# Vercel (recommended) — connect repo, set env vars, auto-deploy on push

# Manual
bun build && bun start

# Edge functions
supabase functions deploy
```

---

**Built by the Rozo AI Team** · support@rozo.ai
