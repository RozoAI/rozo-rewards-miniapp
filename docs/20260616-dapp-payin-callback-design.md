# dApp /payin callback — make Stellar contract payments settle in seconds (design)

**Date**: 2026-06-16
**Repo**: rozo-rewards-miniapp (frontend dApp)
**Branch**: `feat/dapp-payin-callback`
**Status**: Shipped (codex-reviewed, implemented, type-checked)
**Backend dependency**: rozo-intents-api already shipped the instant contract `/payin`
fast-path (commit `133b51b`). This change is the frontend half that actually *triggers* it.

---

## 0. One-line goal

When a user pays a Stellar contract payment (`pay()`) with Rozo Wallet in the dApp,
take the resulting txHash and **immediately POST `/payments/{id}/payin`** so the
backend point-looks-up the on-chain `payment_event` and settles in seconds, instead
of waiting for the every-minute cron (measured: ~32s → seconds).

---

## 1. Background: why it's slow today

- Contract payments (`pay()` via Soroban) are currently discovered **only by the
  backend `monitor-stellar` cron polling `getEvents` every minute** → detection takes
  17–42s, worst case ~60s (jitter, not a fixed slowness).
- The backend **already shipped an instant fast-path**: as soon as someone
  `POST /payments/{id}/payin` with a txHash, the backend point-looks-up that tx's
  `payment_event` over Soroban RPC, validates it, and settles in seconds.
- **But no client calls `/payin` today** (backend shows `immediate_verification` = 0)
  → the fast-path is idle and every contract order still takes the slow cron path.
- **This dApp is the actual payment originator.** Adding the callback here is the
  minimal change that turns the fast-path on.

> Evidence (2026-06-16): a real ZEN order `1d982dc5` took 32.3s via cron; the same
> txHash POSTed to /payin → settled in 8.8s via the fast-path
> (`immediate_verification=true`).

---

## 2. Current code (verified, with line refs)

### 2.1 Wallet bridge: `window.rozo`
`src/types/window.d.ts` — provider injected by the native wallet:
```ts
window.rozo.signAuthEntry(authEntryXdr, { func, submit, message })
  : Promise<{ signedAuthEntry: string; hash: string; status: string; error?: string }>
//                                       ^^^^ ← Stellar txHash is here
```

### 2.2 Payment path
| Step | Location | Key |
|---|---|---|
| Create intent | `restaurant-dapp-payment.tsx` `createPayment(...)` | returns `PaymentResponse`, **with `id: string` (rozo paymentId UUID)** + `source.{receiverAddress, receiverMemo, amount, receiverAddressContract, receiverMemoContract}` |
| Build + submit pay() | `useRozoWallet.ts` `transferUSDC()` | `window.rozo.signAuthEntry(..., {submit:true})` → returns `{ hash }` |
| Get txHash | `restaurant-dapp-payment.tsx` `handlePayWithRozoWallet`, the `if (result.hash) {...}` block | **callback insertion point** |
| AI-service twin | `ai-service-dapp-payment.tsx` | same `if (result.hash)` block |

### 2.3 The key gap (the core change)
`generateBridgeAddress()` (`restaurant-dapp-payment.tsx`) took the `payment` and
**returned only 5 fields, dropping `payment.id`**:
```ts
const payment = await createPayment({...});   // payment.id is the rozo paymentId
return {
  amount: payment.source.amount,
  bridgeAddress: payment.source.receiverAddress,
  memo: payment.source.receiverMemo,
  receiverAddressContract: payment.source.receiverAddressContract,
  receiverMemoContract: payment.source.receiverMemoContract,
  // ❌ payment.id was not plumbed out
};
```
To call `/payments/{id}/payin` we **must plumb `payment.id` out of
`generateBridgeAddress` into `handlePayWithRozoWallet`**. That's change #1.

### 2.4 Backend endpoint (rozo-intents-api, already live)
| | |
|---|---|
| Method/Path | `POST /payment-api/payments/{paymentId}/payin` |
| Base URL | `https://intentapiv4.rozo.ai/functions/v1` (the SDK default; same backend `createPayment` uses) |
| Auth | **none** (function deployed `--no-verify-jwt`) |
| Body | `{ "txHash": "<stellar_tx_hash>", "fromAddress"/"senderAddress": "<optional>" }` |
| Contract-order success | `{ "message": "Payin registered (contract fast-path)", ... }` |

---

## 3. Design

### 3.1 Data flow (after)
```
handlePayWithRozoWallet
  ├─ generateBridgeAddress()  → now also returns paymentId (= payment.id)
  ├─ transferUSDC()           → result.hash (txHash)
  └─ if (result.hash):
       ├─ notifyPayin(paymentId, result.hash, fromAddress)  ← NEW: fire-and-forget, before router.push
       ├─ savePaymentReceipt(...)               ← existing
       ├─ capture(PAYMENT_COMPLETED)            ← existing
       └─ router.push(/receipt...)              ← existing
```

### 3.2 The helper: `src/lib/notify-payin.ts`
Uses the SDK's `updatePaymentPayInTxHash` from `@rozoai/intent-common` rather than a
hand-rolled `fetch`. This matters: the SDK function posts to
`/payment-api/payments/{id}/payin` through the **same `apiClient` base URL that
`createPayment` used** (`intentapiv4.rozo.ai` by default). The `/payin` call MUST hit
the same backend that created the payment, or the paymentId won't exist there —
sharing the SDK apiClient guarantees they never drift apart.

```ts
import { updatePaymentPayInTxHash } from "@rozoai/intent-common";

export function notifyPayin(
  paymentId: string | undefined,
  txHash: string | undefined,
  fromAddress?: string,
): void {
  if (!paymentId || !txHash) return;
  try {
    // No await: kick off synchronously so it's queued before router.push.
    void updatePaymentPayInTxHash({ paymentId, txHash, senderAddress: fromAddress })
      .catch((err) => {
        console.warn("[notifyPayin] fast-path hint failed (cron will back it up):", err);
      });
  } catch (err) {
    console.warn("[notifyPayin] fast-path hint threw (cron will back it up):", err);
  }
}
```

### 3.3 Timing — Plan A (immediate fire-and-forget), no on-chain wait

The frontend does **no amount logic and no on-chain waiting**. The backend owns both:

- **Amount tiering** (`FASTPATH_AMOUNT_GATE_USD`, currently $20): on-chain amount
  ≤ $20 settles instantly; > $20 defers to cron. This is a blast-radius gate, not a
  correctness gate — the safety anchor is contractId allowlist + topic + official USDC
  + 1:1 memo + amount match + CAS idempotency.
- **"tx not yet on-chain"**: `signAuthEntry({submit:true})` is a gasless relayer submit,
  so `result.hash` can come back before the tx is indexed (Soroban contract invoke
  takes ~14–37s on-chain). The backend handles this with a three-layer fallback:
  point-lookup returns `NOT_FOUND` → backend schedules one 5s recheck → still missing
  → the every-minute cron is the final backstop.

So the frontend just fires the hint immediately and moves on. Even when the hint lands
before the tx is indexed, it's still a net win: some fast txs hit instantly, the backend
gets real `immediate_verification` traffic, and cron always backs it up.

> We do NOT poll `getTransaction` to confirm on-chain before calling /payin. `result.status`
> is an unconstrained relayer string and doesn't reliably mean "confirmed", and the
> backend's own fallback already covers the not-yet-indexed case. Adding a frontend poll
> would be more code for marginal benefit.

### 3.4 Both insertion points changed symmetrically
- `restaurant-dapp-payment.tsx` (restaurant cashback)
- `ai-service-dapp-payment.tsx` (AI services)

Both: plumb `paymentId` out of `generateBridgeAddress`, then call `notifyPayin` inside
the `if (result.hash)` block, **before** `router.push`. A repo-wide grep confirmed these
are the **only two** contract-payment entry points (only these two use
`result.hash` / `generateBridgeAddress`).

---

## 4. Change list (minimal)

1. **New** `src/lib/notify-payin.ts` (§3.2).
2. **Edit** `restaurant-dapp-payment.tsx`:
   - `generateBridgeAddress` return value gains `paymentId: payment.id`.
   - `handlePayWithRozoWallet` destructures `paymentId`, calls
     `notifyPayin(paymentId, result.hash, rozoWalletAddress ?? undefined)` in the
     `if (result.hash)` block before `router.push`.
3. **Edit** `ai-service-dapp-payment.tsx`: symmetric to #2.

**Not changed**: `useRozoWallet.transferUSDC` (it only signs + submits; it should not own
a network callback).

---

## 5. Risks / trade-offs

| # | Risk | Handling |
|---|---|---|
| 1 | /payin failure/timeout **blocks payment UI** | fire-and-forget + try/catch + no await. Payment success does **not** depend on /payin; cron always backs it up |
| 2 | `result.hash` exists but tx not on-chain yet → /payin NOT_FOUND | backend 5s recheck + cron backstop (§3.3) |
| 3 | Navigating to receipt cuts off the request | request is kicked off synchronously before `router.push`; the underlying SDK call keeps running across SPA navigation |
| 4 | paymentId missed on some path | both insertion points changed; `notifyPayin` no-ops on empty paymentId |
| 5 | Security: /payin is a no-header public endpoint, frontend sends no secret | by design (backend `--no-verify-jwt`). txHash is public on-chain data; backend validates memo 1:1 with the order + official USDC issuer, so a forged/wrong txHash just makes the backend look up a non-matching tx → it rejects, no side effect |
| 6 | Wrong backend / URL drift | use the SDK's `updatePaymentPayInTxHash` (same apiClient as `createPayment`), so /payin can't point at a different backend than the one that created the payment |

> **Funds safety**: the frontend makes no amount/validation decisions, it only forwards
> the txHash. The backend `settleContractPayin` runs the full validation chain
> (contractId allowlist + topic + official USDC + 1:1 memo + amount gate + CAS). A bad
> txHash from the frontend at most makes the backend look up a non-matching tx → rejected.

---

## 6. Verification

1. **Type check**: `npx tsc --noEmit` — the three changed files have zero errors
   (only the pre-existing, unrelated `posthog-js` module-not-found remains).
2. **Lint**: pre-commit ESLint clean on all three files.
3. **End-to-end (on-chain)**: pay a real contract order → confirm it took the fast-path
   with the backend check script:
   ```bash
   node <rozo-intents-api>/scripts/check-contract-payin.mjs <paymentId>
   # expect: ✅ FAST-PATH (immediate_verification=true), not 🐢 CRON
   ```
4. **Compare**: detection latency before/after for similar orders (cron ~17–42s vs
   fast-path seconds).

---

## 7. codex review outcome (2026-06-16)

Reviewed via `codex exec` on the 5 design points. Result: **4 PASS, 1 must-fix (applied)**.

- **keepalive / timing** — PASS. This is SPA navigation, not document unload; a fetch
  already started keeps running. (Final impl uses the SDK call, same property.)
- **paymentId plumbing** — PASS. Direct and robust at both call sites.
- **failure logging** — was FAIL, now fixed. The original hand-rolled `.catch()` only
  caught network/CORS/abort; an HTTP 4xx/5xx resolves and would've been silent. Fixed
  (and the SDK refactor makes the SDK own response handling).
- **third entry point** — PASS. grep confirms only the two components submit payments.
- **security boundary** — PASS. Public /payin with no secret is correct as long as the
  backend validates id/contract/asset/memo/amount/idempotency, which it does. Treat
  `fromAddress` as advisory only.

---

## Appendix: related
- Backend design: `rozo-intents-api/internaldocs/20260615-stellar-contract-payin-instant-fastpath.md`
- Backend commit: `133b51b feat(stellar-contract): instant /payin fast-path`
- Backend integration example: `rozo-intents-api/scripts/payin-callback-example.md`
