# Rozo Rewards MiniApp

A Base MiniApp for AI promo and cashback platform with ROZO token rewards system

## 🎯 Overview

The Rozo Rewards MiniApp is a comprehensive AI promo and cashback platform that allows users to:
- **Earn ROZO tokens** from purchases at AI services and merchants
- **Use ROZO tokens** to reduce payment amounts (1 ROZO = $0.01 USD)
- **Shop with savings** through a complete order management system
- **Enjoy tier-based benefits** with increasing cashback multipliers

## Screenshots
| Discovery | Lifestyle | Profile |
|---|---|---|
| <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/e66d2bb1-8dcb-40bd-a812-6e7e310f4f8d" /> | <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/9f21188b-196a-4b71-a8f5-87a05e553676" /> | <img width="1284" height="2778" alt="image" src="https://github.com/user-attachments/assets/a3f333e9-b2d0-4337-b32a-957d275e87a3" /> |

## ✨ Key Features

### 🪙 ROZO Token System
- **100:1 Conversion**: 1 ROZO = $0.01 USD
- **Payment Offset**: Use ROZO to reduce actual payment amounts
- **Tier Multipliers**: Bronze (1x) → Silver (1.2x) → Gold (1.5x) → Platinum (2x)

### 🛒 Complete Shopping Experience
- **Shopping Cart**: Add multiple products with individual cashback rates
- **Order Management**: Full lifecycle from cart to completion
- **ROZO Integration**: Apply tokens during checkout for instant savings

### 🏪 Merchant & Product System
- **AI Services**: OpenRouter, Civitai, Venice AI, and more
- **Product SKUs**: Individual cashback rates per product
- **Dynamic Rates**: Product-specific rates override merchant defaults

### 💳 Seamless Payments
- **Crypto Payments**: Via RozoPayButton integration
- **Multi-Chain Support**: Ethereum, Base, Polygon, Optimism, Arbitrum
- **Automatic Cashback**: Earn ROZO tokens on every confirmed purchase

## 🚀 Example Use Case

**Scenario**: User buys $50 worth of AI services

1. **Products**: 2 items with different cashback rates (5% and 8%)
2. **ROZO Offset**: Use 2000 ROZO ($20) to reduce payment
3. **Final Payment**: Pay only $30 instead of $50
4. **Cashback Earned**: 340 ROZO ($3.40) from the purchase
5. **Net Result**: Saved $16.60 (33.2% effective discount!)

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Coinbase OnchainKit**: Wallet integration
- **TailwindCSS**: Modern UI styling
- **TypeScript**: Type-safe development
- **React Query**: State management and caching

### Backend (Supabase)
- **PostgreSQL**: Robust database with ACID compliance
- **Edge Functions**: Serverless API endpoints (Deno runtime)
- **Row Level Security**: Data protection and access control
- **Real-time**: Live updates for transactions and balances

### Blockchain Integration
- **Multi-chain Support**: 5+ supported networks
- **Transaction Verification**: On-chain verification for security
- **Gas Optimization**: Efficient transaction processing

## 📁 Project Structure

```
rozo-rewards-miniapp/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── ai-services/     # AI services catalog page
│   │   ├── restaurant/      # Restaurant/merchant pages
│   │   └── profile/         # User profile management
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── *-list-view.tsx # Feature-specific components
│   └── providers/          # Context providers
├── supabase/
│   ├── migrations/         # Database schema migrations
│   └── functions/          # Edge functions (API)
│       ├── auth/           # Authentication endpoints
│       ├── cashback/       # ROZO cashback system
│       ├── orders/         # Order management
│       ├── products/       # Product catalog
│       ├── merchants/      # Merchant management
│       └── _shared/        # Shared utilities and types
├── docs/                   # Comprehensive API documentation
│   ├── API.md             # Main API documentation
│   ├── ROZO_CASHBACK_API.md
│   ├── ORDER_MANAGEMENT_API.md
│   ├── TECHNICAL_SPEC.md
│   └── openapi.yaml       # OpenAPI specification
└── public/                # Static assets
```

## 🛠️ Tech Stack

### Core Technologies
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **TailwindCSS** - Utility-first CSS framework
- **Viem/Wagmi** - Ethereum development framework

### Blockchain & Payments
- **Coinbase OnchainKit** - Wallet integration
- **RozoPayButton** - Custom payment component
- **Multi-chain Support** - Ethereum, Base, Polygon, Optimism, Arbitrum

### Development Tools
- **ESLint** - Code linting
- **Lefthook** - Git hooks for quality checks
- **pnpm** - Fast package manager

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended)
- Docker (for local Supabase)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/rozo-rewards-miniapp.git
   cd rozo-rewards-miniapp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp example.env .env.local
   # Edit .env.local with your configuration
   ```

4. **Start local Supabase (optional)**
   ```bash
   supabase start
   ```

5. **Run database migrations**
   ```bash
   supabase db reset
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 API Documentation

### 🚀 **Getting Started - New Developers Start Here!**
- **[Complete API Lifecycle Guide](./docs/COMPLETE_API_LIFECYCLE.md)** - Step-by-step tutorial with curl examples
- **[Quick Reference](./docs/API_QUICK_REFERENCE.md)** - Essential commands and patterns (TL;DR version)

### 📖 **Comprehensive Documentation**
- **[API.md](./docs/API.md)** - Complete API reference (all 18 endpoints)
- **[ROZO_CASHBACK_API.md](./docs/ROZO_CASHBACK_API.md)** - ROZO token system details
- **[ORDER_MANAGEMENT_API.md](./docs/ORDER_MANAGEMENT_API.md)** - Shopping cart and orders
- **[TECHNICAL_SPEC.md](./docs/TECHNICAL_SPEC.md)** - Technical implementation details
- **[openapi.yaml](./docs/openapi.yaml)** - OpenAPI 3.0 specification

### 🧪 **Testing & Development**
- **[Live API Tests](./supabase/tests/README.md)** - Comprehensive test suite for production APIs

### Key API Endpoints

#### ROZO Cashback System
- `GET /cashback/balance` - Get ROZO balance
- `POST /cashback/apply-offset` - Calculate payment offset
- `POST /cashback/claim` - Claim cashback from purchases

#### Order Management
- `GET /orders/cart` - Get shopping cart
- `POST /orders/cart` - Add items to cart
- `POST /orders/checkout` - Proceed to checkout
- `GET /orders` - List user orders

#### Product Catalog
- `GET /products` - List products with cashback rates
- `GET /products/{id}` - Get product details
- `GET /merchants` - List merchants and services

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Intercom Integration
INTERCOM_APP_ID=your-intercom-app-id
```

### Supabase Setup

1. Create a new Supabase project
2. Run the provided migrations
3. Configure authentication providers
4. Deploy edge functions

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Lint code
pnpm lint
```

### Test Order Flow
1. Add products to cart
2. Apply ROZO offset during checkout
3. Complete payment with crypto
4. Verify cashback earning

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users & Profiles** - User management with ROZO balances
- **Merchants & Products** - Catalog with individual cashback rates
- **Orders & Order Items** - Complete shopping cart system
- **Cashback Records** - ROZO token transactions
- **Transactions** - Blockchain payment records

Key tables:
- `profiles` - User profiles with ROZO balances
- `merchants` - AI services and merchant catalog
- `products` - SKUs with individual cashback rates
- `orders` - Shopping cart and order management
- `order_items` - Individual products in orders
- `cashback` - ROZO token earning and usage records
- `transactions` - Blockchain payment confirmations

## 🔄 Order Lifecycle

```
Cart → Pending → Paid → Completed
 ↓       ↓        ↓       ↓
Abandoned  Cancelled  Refunded  Cashback Available
```

## 🎯 User Tiers & Benefits

| Tier | Requirement | Multiplier | Example Benefit |
|------|-------------|------------|-----------------|
| Bronze | $0+ earned | 1.0x | 5% → 5% cashback |
| Silver | $500+ earned | 1.2x | 5% → 6% cashback |
| Gold | $2,500+ earned | 1.5x | 5% → 7.5% cashback |
| Platinum | $10,000+ earned | 2.0x | 5% → 10% cashback |

## 🚢 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Supabase Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy cashback-balance
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **API Documentation**: [./docs/API.md](./docs/API.md)
- **Supabase Dashboard**: [Your Supabase Project]
- **Coinbase OnchainKit**: [https://onchainkit.xyz](https://onchainkit.xyz)

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Join our Discord community
- Email: support@rozo.ai

---

**Built with ❤️ by the Rozo AI Team**
