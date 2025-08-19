# Rewards & Cashback Protocol

### Overview
The **Rewards & Cashback Protocol** is a base smart contract designed to enable merchants to offer cashback rewards to users, while also supporting a platform fee model. It provides a simple mechanism for merchants to onboard, for users to accumulate and redeem points, and for administrators to configure global settings.

---

### Key Features
- **Configurable Fee:**
  - Global `feeBp` (basis points) applied to all transactions.
  - Admin can update the fee.

- **Merchant Management:**
  - Merchants are registered with a payout `destination` and a `cashbackBp` (cashback rate in basis points).
  - Admin can set or update merchant parameters.

- **User Cashback:**
  - Users automatically earn cashback points when making purchases.
  - Cashback is calculated based on merchant-specific rates.
  - Points are internal credits, **non-transferrable**, but redeemable against purchases.

- **Purchase Flow:**
  - User pays a set amount in USDC (or any stablecoin integration).
  - Fee is deducted (`feeBp`).
  - Cashback portion is set aside as points for the user.
  - Merchant receives the remainder (`amount - fee - cashback`).

- **Redemption Flow:**
  - Users can redeem their accumulated points to cover purchase costs.
  - Redeemed points are deducted from the user’s cashback balance.

---

### Example Scenario
- Global Fee (`feeBp`) = 100 (1%)
- Merchant A Cashback (`cashbackBp`) = 500 (5%)
- User buys an item worth **100 USDC**:
  - Fee = 1 USDC
  - Cashback = 5 USDC (as points)
  - Merchant receives = 94 USDC

If the user later buys a $5 item and has 500 points, they can redeem those points to cover the cost.

---

### Roadmap
1. **MVP Skeleton (current)**
   - Admin configuration
   - Merchant onboarding
   - Purchase flow with fee & cashback calculation
   - Points redemption

2. **ERC20 Integration**
   - Support stablecoin transfers (e.g., USDC)
   - Secure fund routing between users, merchants, and the platform

3. **Advanced Features**
   - Tiered merchant cashback programs
   - Loyalty campaigns & bonus multipliers
   - Multi-token support
   - Off-chain & cross-chain accounting modules

---

### Vision
The Rewards & Cashback Protocol reimagines digital loyalty programs on-chain. By abstracting merchant incentives and user rewards into a transparent, programmable contract, we unlock:
- **Universal cashback across merchants**
- **Borderless loyalty rewards with stablecoins**
- **Seamless user experiences without intermediaries**

This system provides merchants with tools to grow sales, and users with real value in their spending journey, all secured by blockchain.

---

### Next Steps
- Onboard pilot merchants.
- Gather feedback for improved UX and advanced campaign features.

---

**Contract File:** `RewardsCashback.sol`

**License:** BSD2