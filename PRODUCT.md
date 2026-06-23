# Product

## Register

product

## Users

Consumers making payments at restaurants and AI/lifestyle services. Primary context: mobile webview inside the Rozo Wallet app, or mobile browser. Job to be done: pay quickly, confirm the transaction landed, see the cashback earned. Secondary context: desktop browser for occasional account review. Users range from crypto-curious to non-technical — they should never need to understand wallets or chains to complete a payment.

## Product Purpose

Rozo Rewards is a stablecoin-powered cashback miniapp. Users pay merchants in USDC (via Rozo Wallet, on-chain, or points), earn ROZO points as cashback, and redeem those points on future purchases. Success means a completed payment in under 30 seconds with visible confirmation and a cashback receipt the user actually reads.

## Brand Personality

Trustworthy · Precise · Modern. Infrastructure-grade confidence without crypto jargon. The UI should feel closer to Stripe or Linear than to a loyalty app or a DeFi dashboard — composed, fast, and unambiguous.

## Anti-references

- **Crypto/DeFi dashboards**: no dark-mode-by-default, no chart overload, no technical jargon surfaced to users
- **Traditional banking apps**: no stiff corporate navy-and-gray, no bureaucratic form patterns
- **Generic SaaS / AI-generated UI**: no cream/sand backgrounds, no identical card grids, no shadcn defaults used uncritically

## Design Principles

1. **Clarity over cleverness** — every screen has one obvious next action; never make the user read to decide
2. **Earn trust through precision** — amounts, addresses, and status shown exactly, never approximated or hidden
3. **Speed as respect** — transitions are fast (≤260ms), loading states are immediate, confirmations are instant
4. **Infrastructure confidence** — monochrome base with structure from 1px borders and spacing rhythm, not decorative shadows or gradients
5. **Mobile-first and touch-native** — tap targets ≥44px, payment flows reachable with one thumb, no hover-only affordances

## Accessibility & Inclusion

WCAG AA minimum. All text ≥4.5:1 contrast against background. Focus rings visible (double-ring: white 2px + black 4px). Reduced-motion alternative for all transitions. No color-only status indicators — always paired with text or icon.
