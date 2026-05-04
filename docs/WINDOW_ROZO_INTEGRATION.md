# Pay with Rozo Wallet - Integration Guide

## Overview

This guide shows you how to integrate **Pay with Rozo Wallet** directly using `window.rozo` for USDC transfers on Stellar.

When your dApp is opened in the Rozo Wallet mobile app, the `window.rozo` provider is automatically injected, allowing users to:

- Pay with USDC (gasless transactions)
- Authenticate with biometrics (Face ID/Touch ID)
- No gas fees (sponsored by OpenZeppelin Relayer)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your dApp (WebView)                      │
│                                                              │
│  1. Detect window.rozo                                       │
│  2. Build USDC transfer transaction                          │
│  3. Call window.rozo.signAuthEntry()                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ postMessage
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rozo Wallet App (Native)                    │
│                                                              │
│  4. Show confirmation modal → User approves                  │
│  5. Biometric authentication → Face ID/Touch ID              │
│  6. Sign with Passkey → Submit to Relayer (gasless!)        │
│  7. Return { hash, status, signedAuthEntry }                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Detect Rozo Wallet

```javascript
// Check if window.rozo exists
if (!window.rozo) {
  // Wait for rozo:ready event
  await new Promise((resolve) => {
    window.addEventListener("rozo:ready", resolve, { once: true });
    setTimeout(resolve, 3000);
  });
}

if (!window.rozo) {
  console.log("Not in Rozo Wallet");
  return;
}

// Check connection
const { isConnected } = await window.rozo.isConnected();
if (!isConnected) {
  console.log("Wallet not connected");
  return;
}
```

### 2. Get Wallet Info

```javascript
// Get wallet address
const { address } = await window.rozo.getAddress();
console.log("Wallet:", address); // "CXXX...XXX"

// Get network details
const { network, sorobanRpcUrl, networkPassphrase } =
  await window.rozo.getNetworkDetails();
console.log("Network:", network); // "PUBLIC" or "TESTNET"

// Get balance (in stroops — 7 decimals)
const { balance } = await window.rozo.getBalance();
console.log("Balance:", balance); // "10000000" (1.0 USDC)
```

### 3. Build USDC Transfer Transaction

```javascript
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const USDC_CONTRACTS = {
  PUBLIC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  TESTNET: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
};

function toStroops(amount) {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

// Setup
const server = new Server(sorobanRpcUrl);
const usdcContractId =
  network === "PUBLIC" ? USDC_CONTRACTS.PUBLIC : USDC_CONTRACTS.TESTNET;
const usdcContract = new Contract(usdcContractId);

// Build transfer operation
const amountStroops = toStroops("10.50"); // 105000000n
const hostFunction = usdcContract.call(
  "transfer",
  new Address(fromAddress).toScVal(),
  new Address(toAddress).toScVal(),
  nativeToScVal(amountStroops, { type: "i128" }),
);

// Create dummy source (Relayer will replace this)
const dummySource = new Account(
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  "0",
);

const tx = new TransactionBuilder(dummySource, {
  fee: "100",
  networkPassphrase,
})
  .addOperation(hostFunction)
  .setTimeout(30)
  .build();
```

### 4. Simulate to Get Auth Entries

```javascript
const simulation = await server.simulateTransaction(tx);

if ("error" in simulation) {
  throw new Error(`Simulation failed: ${simulation.error}`);
}

const authEntries = simulation.result?.auth || [];
if (authEntries.length === 0) {
  throw new Error("No auth entries found");
}

const authEntryXdr =
  typeof authEntries[0] === "string"
    ? authEntries[0]
    : authEntries[0].toXDR("base64");
```

### 5. Extract Host Function XDR

```javascript
const txXdr = tx.toEnvelope().v1().tx();
const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
const funcXdr = opXdr.hostFunction().toXDR("base64");
```

### 6. Sign and Submit

```javascript
const result = await window.rozo.signAuthEntry(authEntryXdr, {
  func: funcXdr,
  submit: true,
  message: "Transfer 10.50 USDC",
});

console.log("Hash:", result.hash);
console.log("Status:", result.status);
```

---

## Error Handling

Every `window.rozo` method rejects with a structured error containing three properties:

| Property             | Type                  | Description                                                        |
| -------------------- | --------------------- | ------------------------------------------------------------------ |
| `code`               | `string`              | Machine-readable error code (stable, safe for `switch` statements) |
| `message`            | `string`              | User-friendly message (safe to display directly in UI)             |
| `recoverySuggestion` | `string \| undefined` | Optional hint for how to resolve the error                         |

### Basic Usage

```javascript
try {
  const result = await window.rozo.signAuthEntry(authEntryXdr, {
    func: funcXdr,
    submit: true,
  });
} catch (error) {
  console.log(error.code); // "USER_REJECTED"
  console.log(error.message); // "Transaction cancelled"
  console.log(error.recoverySuggestion); // undefined
}
```

### Handling by Error Code

Use `error.code` for control flow — these codes are stable and won't change when we update UI copy:

```javascript
try {
  await window.rozo.signAuthEntry(authEntryXdr, { func, submit: true });
} catch (error) {
  switch (error.code) {
    // ── User intentionally cancelled ──
    case "USER_REJECTED":
    case "USER_CANCELLED":
    case "PASSKEY_CANCELLED":
      // Silently dismiss — user chose to cancel
      break;

    // ── Retryable errors ──
    case "TIMEOUT":
    case "NETWORK_ERROR":
    case "SERVICE_UNAVAILABLE":
    case "RATE_LIMITED":
      showRetryPrompt(error.message);
      break;

    // ── User needs to fix something ──
    case "WALLET_NOT_CONNECTED":
      promptWalletConnect();
      break;
    case "INSUFFICIENT_BALANCE":
      showInsufficientFunds(error.message);
      break;

    // ── Everything else ──
    default:
      showError(error.message, error.recoverySuggestion);
  }
}
```

### Helper: Check if User Cancelled

```javascript
function isUserCancellation(error) {
  const code = error?.code;
  return (
    code === "USER_REJECTED" ||
    code === "USER_CANCELLED" ||
    code === "PASSKEY_CANCELLED"
  );
}

// Usage
try {
  await window.rozo.signAuthEntry(authXdr, { func, submit: true });
} catch (error) {
  if (isUserCancellation(error)) return; // User chose to cancel
  showError(error.message);
}
```

### Displaying Errors

The `message` field is always user-friendly. You can display it directly:

```javascript
try {
  await window.rozo.signAuthEntry(authXdr, { func, submit: true });
} catch (error) {
  if (isUserCancellation(error)) return;

  // Option 1: Just the message
  toast.error(error.message);

  // Option 2: Message + recovery suggestion
  const text = error.recoverySuggestion
    ? `${error.message}. ${error.recoverySuggestion}`
    : error.message;
  toast.error(text);
}
```

### Error Codes Reference

| Code                     | When                                     | User Message Example                      |
| ------------------------ | ---------------------------------------- | ----------------------------------------- |
| **User Actions**         |                                          |                                           |
| `USER_REJECTED`          | User clicked Reject on signing modal     | "Transaction cancelled"                   |
| `USER_CANCELLED`         | User cancelled an operation              | "Operation was cancelled"                 |
| `PASSKEY_CANCELLED`      | User dismissed passkey/biometric prompt  | "Passkey cancelled"                       |
| **Connection**           |                                          |                                           |
| `WALLET_NOT_CONNECTED`   | No wallet available or not connected     | "Wallet not connected"                    |
| `WALLET_NOT_DEPLOYED`    | Smart wallet contract not yet deployed   | "Your wallet is still being set up"       |
| `BRIDGE_NOT_AVAILABLE`   | Not running inside Rozo WebView          | "Rozo wallet bridge not available"        |
| **Validation**           |                                          |                                           |
| `INVALID_PARAMS`         | Missing or invalid method parameters     | "Transaction XDR is required"             |
| `INSUFFICIENT_BALANCE`   | Not enough funds for the operation       | "Insufficient balance"                    |
| `INVALID_AMOUNT`         | Amount validation failed                 | "Invalid amount"                          |
| `AMOUNT_TOO_LOW`         | Below minimum threshold                  | "Amount below minimum"                    |
| `AMOUNT_TOO_HIGH`        | Exceeds maximum threshold                | "Amount exceeds maximum"                  |
| **Signing / Submission** |                                          |                                           |
| `SIGNING_FAILED`         | Passkey signing failed                   | "Passkey authentication failed"           |
| `SUBMISSION_FAILED`      | Transaction submission to network failed | "Transaction submission failed"           |
| `SIMULATION_FAILED`      | Soroban simulation failed                | "Unable to process transaction"           |
| `AUTHORIZATION_FAILED`   | No auth entries or authorization issue   | "Transaction authorization failed"        |
| **Network**              |                                          |                                           |
| `NETWORK_ERROR`          | Network connectivity issue               | "Network connection issue"                |
| `TIMEOUT`                | 2-minute request timeout exceeded        | "Request timed out"                       |
| `RATE_LIMITED`           | Too many requests                        | "Too many requests"                       |
| `SERVICE_UNAVAILABLE`    | Server error (500/502/503)               | "Service temporarily unavailable"         |
| **Other**                |                                          |                                           |
| `UNSUPPORTED_METHOD`     | Called an unknown method                 | "Unknown method: xyz"                     |
| `UNKNOWN_ERROR`          | Unrecognized error                       | "Something went wrong. Please try again." |

### TypeScript Support

If using `@rozo/web-core`, you get full type support:

```typescript
import type { RozoProviderError, RozoErrorCode } from "@rozo/web-core";
import { isRozoProviderError } from "@rozo/web-core";

try {
  await window.rozo.signTransaction(xdr);
} catch (error) {
  if (isRozoProviderError(error)) {
    // Fully typed: error.code, error.message, error.recoverySuggestion
    const code: RozoErrorCode = error.code;

    if (code === "USER_REJECTED") {
      return; // Silent dismiss
    }

    showError(error.message);
  }
}
```

---

## Complete Examples

### HTML + Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pay with Rozo Wallet</title>
  </head>
  <body>
    <div id="app">
      <h1>Coffee Shop</h1>
      <p id="status">Loading...</p>
      <div id="payment-form" style="display: none;">
        <p>Balance: <span id="balance">-</span> USDC</p>
        <input type="number" id="amount" value="5.00" step="0.01" />
        <button id="pay-btn">Pay with Rozo Wallet</button>
      </div>
    </div>

    <script type="module">
      import {
        Account,
        Address,
        Contract,
        nativeToScVal,
        TransactionBuilder,
      } from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk/+esm";
      import { Server } from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk/rpc/+esm";

      // ========================================================================
      // Configuration
      // ========================================================================

      const MERCHANT_ADDRESS =
        "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3UBSIB3GN5QA";

      const USDC_CONTRACTS = {
        PUBLIC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
        TESTNET: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      };

      // ========================================================================
      // DOM Elements
      // ========================================================================

      const statusEl = document.getElementById("status");
      const paymentFormEl = document.getElementById("payment-form");
      const balanceEl = document.getElementById("balance");
      const amountInput = document.getElementById("amount");
      const payBtn = document.getElementById("pay-btn");

      // ========================================================================
      // Helpers
      // ========================================================================

      function showStatus(message) {
        statusEl.textContent = message;
      }

      function fromStroops(stroops) {
        const amount = BigInt(stroops);
        const whole = amount / BigInt(10_000_000);
        const decimal = amount % BigInt(10_000_000);
        const decimalStr = decimal.toString().padStart(7, "0");
        return `${whole}.${decimalStr}`.replace(/\.?0+$/, "");
      }

      function toStroops(amount) {
        const [whole, decimal = ""] = amount.split(".");
        const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
        return BigInt(whole + paddedDecimal);
      }

      function isUserCancellation(error) {
        const code = error?.code;
        return (
          code === "USER_REJECTED" ||
          code === "USER_CANCELLED" ||
          code === "PASSKEY_CANCELLED"
        );
      }

      // ========================================================================
      // Transfer USDC
      // ========================================================================

      async function transferUSDC(toAddress, amount) {
        showStatus("Preparing transaction...");

        try {
          const { address: fromAddress } = await window.rozo.getAddress();
          const { sorobanRpcUrl, networkPassphrase, network } =
            await window.rozo.getNetworkDetails();

          const server = new Server(sorobanRpcUrl);
          const usdcContractId =
            network === "PUBLIC"
              ? USDC_CONTRACTS.PUBLIC
              : USDC_CONTRACTS.TESTNET;
          const usdcContract = new Contract(usdcContractId);

          const amountStroops = toStroops(amount);

          // Build transfer operation
          const hostFunction = usdcContract.call(
            "transfer",
            new Address(fromAddress).toScVal(),
            new Address(toAddress).toScVal(),
            nativeToScVal(amountStroops, { type: "i128" }),
          );

          const dummySource = new Account(
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "0",
          );

          const tx = new TransactionBuilder(dummySource, {
            fee: "100",
            networkPassphrase,
          })
            .addOperation(hostFunction)
            .setTimeout(30)
            .build();

          // Simulate
          showStatus("Simulating transaction...");
          const simulation = await server.simulateTransaction(tx);

          if ("error" in simulation) {
            throw new Error(`Simulation failed: ${simulation.error}`);
          }

          const authEntries = simulation.result?.auth || [];
          if (authEntries.length === 0) {
            throw new Error("No auth entries found");
          }

          const authEntryXdr =
            typeof authEntries[0] === "string"
              ? authEntries[0]
              : authEntries[0].toXDR("base64");

          const txXdr = tx.toEnvelope().v1().tx();
          const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
          const funcXdr = opXdr.hostFunction().toXDR("base64");

          // Sign and submit
          showStatus("Waiting for confirmation...");

          const result = await window.rozo.signAuthEntry(authEntryXdr, {
            func: funcXdr,
            submit: true,
            message: `Transfer ${amount} USDC`,
          });

          if (!result.hash) {
            throw new Error("Transaction submission failed");
          }

          showStatus(
            `✅ Payment successful! Tx: ${result.hash.slice(0, 8)}...`,
          );
          await refreshBalance();
          return result;
        } catch (error) {
          console.error("Transfer error:", error);

          // Use error.code for control flow
          if (isUserCancellation(error)) {
            showStatus("Payment cancelled");
            return;
          }

          // Display the user-friendly message from the wallet
          const text = error.recoverySuggestion
            ? `${error.message}. ${error.recoverySuggestion}`
            : error.message;
          showStatus(`❌ ${text}`);

          throw error;
        }
      }

      // ========================================================================
      // Refresh Balance
      // ========================================================================

      async function refreshBalance() {
        if (!window.rozo) return;

        try {
          const { balance } = await window.rozo.getBalance();
          balanceEl.textContent = fromStroops(balance);
        } catch (error) {
          console.error("Failed to get balance:", error);
        }
      }

      // ========================================================================
      // Initialize
      // ========================================================================

      async function init() {
        if (!window.rozo) {
          await new Promise((resolve) => {
            window.addEventListener("rozo:ready", resolve, { once: true });
            setTimeout(resolve, 3000);
          });
        }

        if (!window.rozo) {
          showStatus("⚠️ Please open this page in the Rozo Wallet app");
          return;
        }

        const { isConnected } = await window.rozo.isConnected();
        if (!isConnected) {
          showStatus("⚠️ Wallet not connected");
          return;
        }

        const { address } = await window.rozo.getAddress();
        console.log("Wallet address:", address);

        await refreshBalance();

        showStatus("Ready to accept payments");
        paymentFormEl.style.display = "block";

        payBtn.onclick = async () => {
          const amount = amountInput.value;

          if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
          }

          const balance = parseFloat(balanceEl.textContent);
          if (balance < parseFloat(amount)) {
            alert(`Insufficient balance. You have ${balance} USDC.`);
            return;
          }

          payBtn.disabled = true;
          try {
            await transferUSDC(MERCHANT_ADDRESS, amount);
          } finally {
            payBtn.disabled = false;
          }
        };
      }

      init().catch(console.error);
    </script>
  </body>
</html>
```

### React + TypeScript

```tsx
import { useEffect, useState } from "react";
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const USDC_CONTRACTS = {
  PUBLIC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  TESTNET: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
};

function toStroops(amount: string): bigint {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

function isUserCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return (
    code === "USER_REJECTED" ||
    code === "USER_CANCELLED" ||
    code === "PASSKEY_CANCELLED"
  );
}

function PaymentButton() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!window.rozo) return;

      const { isConnected } = await window.rozo.isConnected();
      if (!isConnected) return;

      const { address } = await window.rozo.getAddress();
      const { balance } = await window.rozo.getBalance();

      setIsConnected(true);
      setAddress(address);
      setBalance(balance);
    }

    init();
  }, []);

  async function handlePay() {
    if (!window.rozo) return;

    setIsLoading(true);
    setError(null);

    try {
      const { sorobanRpcUrl, networkPassphrase, network } =
        await window.rozo.getNetworkDetails();
      const { address: fromAddress } = await window.rozo.getAddress();

      const server = new Server(sorobanRpcUrl);
      const usdcContractId =
        network === "PUBLIC" ? USDC_CONTRACTS.PUBLIC : USDC_CONTRACTS.TESTNET;
      const usdcContract = new Contract(usdcContractId);

      const toAddress =
        "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3UBSIB3GN5QA";
      const amount = "10.00";
      const amountStroops = toStroops(amount);

      const hostFunction = usdcContract.call(
        "transfer",
        new Address(fromAddress).toScVal(),
        new Address(toAddress).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" }),
      );

      const dummySource = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0",
      );

      const tx = new TransactionBuilder(dummySource, {
        fee: "100",
        networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);

      if ("error" in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const authEntries = simulation.result?.auth || [];
      const authEntryXdr =
        typeof authEntries[0] === "string"
          ? authEntries[0]
          : authEntries[0].toXDR("base64");

      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR("base64");

      const result = await window.rozo.signAuthEntry(authEntryXdr, {
        func: funcXdr,
        submit: true,
        message: `Transfer ${amount} USDC`,
      });

      alert(`Success! Transaction: ${result.hash}`);

      const { balance: newBalance } = await window.rozo.getBalance();
      setBalance(newBalance);
    } catch (err) {
      console.error("Payment failed:", err);

      // User cancelled — don't show error
      if (isUserCancellation(err)) return;

      // Display the user-friendly message from the wallet
      const rozoErr = err as { message: string; recoverySuggestion?: string };
      const text = rozoErr.recoverySuggestion
        ? `${rozoErr.message}. ${rozoErr.recoverySuggestion}`
        : rozoErr.message;
      setError(text);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isConnected) {
    return <div>Open in Rozo Wallet to pay</div>;
  }

  return (
    <div>
      <p>Wallet: {address}</p>
      <p>
        Balance: {balance ? (BigInt(balance) / 10_000_000n).toString() : "-"}{" "}
        USDC
      </p>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handlePay} disabled={isLoading}>
        {isLoading ? "Processing..." : "Pay $10 USDC"}
      </button>
    </div>
  );
}

export default PaymentButton;
```

---

## What Happens in the Wallet

When you call `window.rozo.signAuthEntry()`:

1. **Confirmation Modal** appears showing the transaction description, recipient, amount, and network
2. **User clicks "Confirm"** or "Cancel" — if cancelled, your catch block receives `error.code === 'USER_REJECTED'`
3. **Biometric Authentication** — Face ID / Touch ID (cannot be bypassed)
4. **Sign with Passkey** — signs in secure enclave, private key never exposed
5. **Submit to Relayer** (when `submit: true`) — OpenZeppelin Relayer sponsors gas fees
6. **Return Result**:
   ```javascript
   {
     signedAuthEntry: "AAAABg...",  // Signed XDR
     hash: "a1b2c3...",             // Transaction hash
     status: "PENDING"              // Status
   }
   ```

---

## Key Points

### Always Use `submit: true`

```javascript
await window.rozo.signAuthEntry(authEntryXdr, {
  func: funcXdr,
  submit: true, // ← This makes it gasless!
});
```

### Amount Conversion

USDC on Stellar has **7 decimals** (stroops):

- `"1.00"` USDC = `10_000_000` stroops
- `"10.50"` USDC = `105_000_000` stroops

```javascript
function toStroops(amount) {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
  return BigInt(whole + paddedDecimal);
}
```

### Network Detection

```javascript
const { network } = await window.rozo.getNetworkDetails();

const usdcAddress =
  network === "PUBLIC"
    ? "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75" // Mainnet
    : "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"; // Testnet
```

---

## Testing

1. **Install Rozo Wallet** mobile app (iOS/Android)
2. **Start your dev server** with HTTPS:
   ```bash
   npx ngrok http 3000
   ```
3. **Open your app** in Rozo Wallet's Explore tab
4. **Test on testnet** first before mainnet

---

## API Reference

For the full `window.rozo` API (all methods, events, signing flows), see [WebView Provider Documentation](./WEBVIEW-PROVIDER.md).

---

_Last updated: May 2026_
