# window.rozo Payment Integration Guide

This guide documents how to implement Rozo Wallet (`window.rozo`) payment flow, including bridge address generation and contract-based `pay` execution.

## Reference Files

- `src/app/restaurant/[id]/FabActionsOrNothing.tsx`
- `src/app/restaurant/[id]/page.tsx`
- `src/hooks/useRozoWallet.ts`
- `src/types/window.d.ts`

> Note: `FabActionsOrNothing.tsx` only controls FAB visibility (`dapp=true` hides FAB).  
> Payment logic lives in `page.tsx` and `useRozoWallet.ts`.

## 1) `window.rozo` Provider Contract

Define the wallet provider shape in `src/types/window.d.ts`:

- `isConnected(): Promise<{ isConnected: boolean }>`
- `getAddress(): Promise<{ address: string }>`
- `getBalance(): Promise<{ balance: string }>` (stroops, 7 decimals)
- `getNetworkDetails(): Promise<{ network; sorobanRpcUrl; networkPassphrase }>`
- `signAuthEntry(authEntryXdr, { func, submit, message })`

This keeps TypeScript-safe access to `window.rozo` in client components/hooks.

## 2) Detect Wallet Availability (`rozo:ready`)

In `useRozoWallet`:

1. Check `typeof window !== "undefined"`.
2. If `window.rozo` is missing, wait for the `rozo:ready` event (with timeout).
3. Call:
   - `window.rozo.isConnected()`
   - `window.rozo.getAddress()`
   - `window.rozo.getBalance()`
4. Convert balance from stroops to decimal display with `fromStroops`.

This enables graceful fallback when app runs outside Rozo Wallet webview.

## 3) Build the Bridge Payment Source

In `src/app/restaurant/[id]/page.tsx`, `generateBridgeAddress()` calls `createPayment()`:

- Target (destination) is EVM/Base:
  - `toAddress` (merchant address)
  - `toChain: baseUSDC.chainId`
  - `toToken: baseUSDC.token`
  - `toUnits: amountUsd`
- Preferred source is Stellar/Rozo:
  - `preferredChain: rozoStellarUSDC.chainId`
  - `preferredTokenAddress: rozoStellarUSDC.token`

`createPayment()` returns `payment.source.*`. Validate:

- `payment.source.receiverAddress`
- `payment.source.amount`
- `payment.source.receiverMemo`

And return these for wallet execution:

- `receiverAddressContract`
- `receiverMemoContract`

If any source value is missing, throw `Failed to generate bridge address`.

## 4) Execute `pay` via `window.rozo` (Gasless)

In `useRozoWallet.transferUSDC(amount, receiverAddressContract, receiverMemoContract)`:

1. Validate:
   - `window.rozo` exists
   - wallet is connected
   - receiver contract address + memo are provided
2. Dynamically import Stellar SDK modules to avoid SSR issues.
3. Read:
   - sender address from `window.rozo.getAddress()`
   - network info from `window.rozo.getNetworkDetails()`
4. Create `Contract(receiverAddressContract)`.
5. Convert amount to stroops (`toStroops`, 7 decimals).
6. Build host function call:
   - `pay(fromAddress, amountStroops, receiverMemoContract)`
7. Build + simulate Soroban tx using dummy source account.
8. Extract:
   - first auth entry (`authEntryXdr`)
   - host function XDR (`funcXdr`)
9. Call:
   - `window.rozo.signAuthEntry(authEntryXdr, { func: funcXdr, submit: true, message })`
10. On success, refresh wallet balance.

Why `submit: true`:

- Transaction is submitted via relayer (gasless UX for user).

## 5) UI Flow and Conditional Rendering

In `page.tsx`:

- If `isRozoWalletAvailable && isRozoWalletConnected`:
  - Show **Pay with Rozo Wallet** only.
  - Hide Crypto + Points options.
- Else:
  - Show `RozoPayButton` (crypto flow) and points flow.

Rozo Wallet button handler:

1. Convert local currency amount to USD.
2. Call `generateBridgeAddress()`.
3. Call `rozoWalletTransfer(amount, receiverAddressContract, receiverMemoContract)`.
4. On success:
   - persist receipt data (`savePaymentReceipt`)
   - route to `/receipt?payment_id=...&withRozoWallet=true`.

## 6) Required Metadata and IDs

Current implementation includes:

- `appId`: `rozoRewardsBNBStellarMP-${restaurant.handle}`
- `merchantOrderId`: `${restaurant.handle.toUpperCase()}-${timestamp}`
- Metadata payload from `generateMetadata()`:
  - local amount + currency
  - USD equivalent context
  - order id
  - optional `receiptUrl` for live merchants

Keep these stable for reconciliation and receipt tracking.

## 7) Error Handling (Recommended)

Handle and map these user-facing cases:

- User rejection -> `Payment cancelled`
- Insufficient balance -> `Insufficient USDC balance`
- Missing bridge source fields -> `Failed to generate bridge address`
- Simulation/auth errors -> generic payment failure with debug log

Also:

- always reset loading state in `finally`
- never continue receipt navigation if `result.hash` is absent

## 8) Minimal Integration Checklist

- [ ] Add `window.rozo` TS types in `src/types/window.d.ts`
- [ ] Implement availability + connection detection in `useRozoWallet`
- [ ] Implement `transferUSDC` with Soroban simulation + `signAuthEntry`
- [ ] Implement bridge generation with `createPayment`
- [ ] Require `receiverAddressContract` + `receiverMemoContract` for transfer
- [ ] Conditionally render Rozo Wallet payment button
- [ ] Save receipt and redirect on successful hash
- [ ] Add clear user-facing error messages

## 9) Quick Test Matrix

1. Rozo Wallet not injected:
   - falls back to crypto/points buttons.
2. Rozo Wallet injected but disconnected:
   - no Rozo payment action allowed.
3. Bridge generation fails:
   - toast error, no transfer call.
4. User rejects signing:
   - cancellation toast, no receipt redirect.
5. Successful pay:
   - tx hash exists, receipt saved, redirected with `withRozoWallet=true`.
