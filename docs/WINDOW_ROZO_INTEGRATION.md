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

## Complete Example: USDC Transfer

### HTML + Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    } from 'https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk/+esm';
    import { Server } from 'https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk/rpc/+esm';

    // ========================================================================
    // Configuration
    // ========================================================================

    const MERCHANT_ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3UBSIB3GN5QA';

    const USDC_CONTRACTS = {
      PUBLIC: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
      TESTNET: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    };

    // ========================================================================
    // DOM Elements
    // ========================================================================

    const statusEl = document.getElementById('status');
    const paymentFormEl = document.getElementById('payment-form');
    const balanceEl = document.getElementById('balance');
    const amountInput = document.getElementById('amount');
    const payBtn = document.getElementById('pay-btn');

    // ========================================================================
    // Helper Functions
    // ========================================================================

    function showStatus(message) {
      statusEl.textContent = message;
    }

    function fromStroops(stroops) {
      const amount = BigInt(stroops);
      const whole = amount / BigInt(10_000_000);
      const decimal = amount % BigInt(10_000_000);
      const decimalStr = decimal.toString().padStart(7, '0');
      return `${whole}.${decimalStr}`.replace(/\.?0+$/, '');
    }

    function toStroops(amount) {
      const [whole, decimal = ''] = amount.split('.');
      const paddedDecimal = decimal.padEnd(7, '0').slice(0, 7);
      return BigInt(whole + paddedDecimal);
    }

    // ========================================================================
    // Main: Transfer USDC using window.rozo
    // ========================================================================

    async function transferUSDC(toAddress, amount) {
      showStatus('Preparing transaction...');

      try {
        // Step 1: Get wallet info
        const { address: fromAddress } = await window.rozo.getAddress();
        const { sorobanRpcUrl, networkPassphrase, network } =
          await window.rozo.getNetworkDetails();

        console.log('From:', fromAddress);
        console.log('To:', toAddress);
        console.log('Amount:', amount);
        console.log('Network:', network);

        // Step 2: Setup RPC and contract
        const server = new Server(sorobanRpcUrl);
        const usdcContractId =
          network === 'PUBLIC' ? USDC_CONTRACTS.PUBLIC : USDC_CONTRACTS.TESTNET;
        const usdcContract = new Contract(usdcContractId);

        // Step 3: Convert amount to stroops (7 decimals)
        const amountStroops = toStroops(amount);
        console.log('Amount (stroops):', amountStroops.toString());

        // Step 4: Build USDC transfer operation
        const hostFunction = usdcContract.call(
          'transfer',
          new Address(fromAddress).toScVal(),
          new Address(toAddress).toScVal(),
          nativeToScVal(amountStroops, { type: 'i128' })
        );

        // Step 5: Create dummy source for simulation
        // (Relayer will set the real source when submitting)
        const dummySource = new Account(
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          '0'
        );

        const tx = new TransactionBuilder(dummySource, {
          fee: '100',
          networkPassphrase,
        })
          .addOperation(hostFunction)
          .setTimeout(30)
          .build();

        // Step 6: Simulate transaction to get auth entries
        showStatus('Simulating transaction...');
        console.log('Simulating...');

        const simulation = await server.simulateTransaction(tx);

        if ('error' in simulation) {
          throw new Error(`Simulation failed: ${simulation.error}`);
        }

        // Step 7: Extract auth entries and host function XDR
        const authEntries = simulation.result?.auth || [];
        if (authEntries.length === 0) {
          throw new Error('No auth entries found');
        }

        const authEntryXdr =
          typeof authEntries[0] === 'string'
            ? authEntries[0]
            : authEntries[0].toXDR('base64');

        const txXdr = tx.toEnvelope().v1().tx();
        const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
        const funcXdr = opXdr.hostFunction().toXDR('base64');

        console.log('Auth entries:', authEntries.length);
        console.log('Auth entry XDR length:', authEntryXdr.length);
        console.log('Func XDR length:', funcXdr.length);

        // Step 8: Sign and submit via window.rozo
        showStatus('Waiting for confirmation...');
        console.log('Calling window.rozo.signAuthEntry...');

        const result = await window.rozo.signAuthEntry(authEntryXdr, {
          func: funcXdr,
          submit: true, // Submit via OpenZeppelin Relayer (gasless!)
          message: `Transfer ${amount} USDC`,
        });

        if (!result.hash) {
          throw new Error('Transaction submission failed');
        }

        console.log('Success!');
        console.log('Hash:', result.hash);
        console.log('Status:', result.status);

        showStatus(`✅ Payment successful! Tx: ${result.hash.slice(0, 8)}...`);

        // Refresh balance
        await refreshBalance();

        return result;
      } catch (error) {
        console.error('Transfer error:', error);

        if (error.message.includes('User rejected')) {
          showStatus('❌ Payment cancelled by user');
        } else {
          showStatus(`❌ Error: ${error.message}`);
        }

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
        console.error('Failed to get balance:', error);
      }
    }

    // ========================================================================
    // Initialize App
    // ========================================================================

    async function init() {
      // Wait for window.rozo to be injected
      if (!window.rozo) {
        await new Promise((resolve) => {
          window.addEventListener('rozo:ready', resolve, { once: true });
          setTimeout(resolve, 3000);
        });
      }

      // Check if window.rozo is available
      if (!window.rozo) {
        showStatus('⚠️ Please open this page in the Rozo Wallet app');
        return;
      }

      // Check connection
      const { isConnected } = await window.rozo.isConnected();
      if (!isConnected) {
        showStatus('⚠️ Wallet not connected');
        return;
      }

      // Get wallet address
      const { address } = await window.rozo.getAddress();
      console.log('Wallet address:', address);

      // Get balance
      await refreshBalance();

      // Show payment form
      showStatus('Ready to accept payments');
      paymentFormEl.style.display = 'block';

      // Handle payment
      payBtn.onclick = async () => {
        const amount = amountInput.value;

        // Validate amount
        if (!amount || parseFloat(amount) <= 0) {
          alert('Please enter a valid amount');
          return;
        }

        // Check balance
        const balance = parseFloat(balanceEl.textContent);
        if (balance < parseFloat(amount)) {
          alert(`Insufficient balance. You have ${balance} USDC.`);
          return;
        }

        // Disable button
        payBtn.disabled = true;

        try {
          await transferUSDC(MERCHANT_ADDRESS, amount);
        } finally {
          payBtn.disabled = false;
        }
      };
    }

    // Start the app
    init().catch(console.error);
  </script>
</body>
</html>
```

## Step-by-Step Breakdown

### 1. Detect Rozo Wallet

```javascript
// Check if window.rozo exists
if (!window.rozo) {
  // Wait for rozo:ready event
  await new Promise((resolve) => {
    window.addEventListener('rozo:ready', resolve, { once: true });
    setTimeout(resolve, 3000);
  });
}

if (!window.rozo) {
  console.log('Not in Rozo Wallet');
  return;
}

// Check connection
const { isConnected } = await window.rozo.isConnected();
if (!isConnected) {
  console.log('Wallet not connected');
  return;
}
```

### 2. Get Wallet Info

```javascript
// Get wallet address
const { address } = await window.rozo.getAddress();
console.log('Wallet:', address); // "CXXX...XXX"

// Get network details
const { network, sorobanRpcUrl, networkPassphrase } =
  await window.rozo.getNetworkDetails();
console.log('Network:', network); // "PUBLIC" or "TESTNET"

// Get balance
const { balance } = await window.rozo.getBalance();
console.log('Balance:', balance); // "10000000" (1.0 USDC in stroops)
```

### 3. Build USDC Transfer Transaction

```javascript
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';

// USDC contract addresses
const USDC_CONTRACTS = {
  PUBLIC: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
  TESTNET: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
};

// Setup
const server = new Server(sorobanRpcUrl);
const usdcContractId = network === 'PUBLIC'
  ? USDC_CONTRACTS.PUBLIC
  : USDC_CONTRACTS.TESTNET;
const usdcContract = new Contract(usdcContractId);

// Convert amount to stroops (7 decimals)
// "10.50" → 105000000n
function toStroops(amount) {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(7, '0').slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

const amountStroops = toStroops('10.50'); // 105000000n

// Build transfer operation
const hostFunction = usdcContract.call(
  'transfer',
  new Address(fromAddress).toScVal(),  // From
  new Address(toAddress).toScVal(),    // To
  nativeToScVal(amountStroops, { type: 'i128' })  // Amount
);

// Create dummy source (Relayer will replace this)
const dummySource = new Account(
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  '0'
);

// Build transaction
const tx = new TransactionBuilder(dummySource, {
  fee: '100',
  networkPassphrase,
})
  .addOperation(hostFunction)
  .setTimeout(30)
  .build();
```

### 4. Simulate to Get Auth Entries

```javascript
// Simulate transaction
const simulation = await server.simulateTransaction(tx);

if ('error' in simulation) {
  throw new Error(`Simulation failed: ${simulation.error}`);
}

// Extract auth entries
const authEntries = simulation.result?.auth || [];
if (authEntries.length === 0) {
  throw new Error('No auth entries found');
}

// Convert to XDR (base64)
const authEntryXdr =
  typeof authEntries[0] === 'string'
    ? authEntries[0]
    : authEntries[0].toXDR('base64');
```

### 5. Extract Host Function XDR

```javascript
// Get host function XDR from transaction
const txXdr = tx.toEnvelope().v1().tx();
const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
const funcXdr = opXdr.hostFunction().toXDR('base64');
```

### 6. Sign and Submit via window.rozo

```javascript
// Sign and submit via OpenZeppelin Relayer (gasless!)
const result = await window.rozo.signAuthEntry(authEntryXdr, {
  func: funcXdr,           // Host function XDR (required for submit: true)
  submit: true,            // Submit via Relayer (gasless!)
  message: 'Transfer 10.50 USDC',  // User-facing description
});

console.log('Transaction hash:', result.hash);
console.log('Status:', result.status);
console.log('Signed auth entry:', result.signedAuthEntry);
```

### What Happens in the Wallet

When you call `window.rozo.signAuthEntry()`:

1. **Confirmation Modal** appears showing:
   - Description: "Transfer 10.50 USDC"
   - Recipient: GDQP...GN5QA
   - Amount: 10.50 USDC
   - Network: PUBLIC/TESTNET

2. **User clicks "Confirm"** or "Cancel"
   - If cancelled → throws error: "User rejected the signing request"

3. **Biometric Authentication**
   - Face ID / Touch ID / Fingerprint
   - Cannot be bypassed

4. **Sign with Passkey**
   - Signs in secure enclave
   - Private key never exposed

5. **Submit to Relayer** (when `submit: true`)
   - OpenZeppelin Relayer sponsors gas fees
   - Submits to Stellar network

6. **Return Result**
   ```javascript
   {
     signedAuthEntry: "AAAABg...",  // Signed XDR
     hash: "a1b2c3...",             // Transaction hash
     status: "PENDING"              // Status
   }
   ```

## React Example

```tsx
import { useEffect, useState } from 'react';
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';

const USDC_CONTRACTS = {
  PUBLIC: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
  TESTNET: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
};

function toStroops(amount: string): bigint {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(7, '0').slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

function PaymentButton() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      // Get network details
      const { sorobanRpcUrl, networkPassphrase, network } =
        await window.rozo.getNetworkDetails();
      const { address: fromAddress } = await window.rozo.getAddress();

      // Setup
      const server = new Server(sorobanRpcUrl);
      const usdcContractId =
        network === 'PUBLIC' ? USDC_CONTRACTS.PUBLIC : USDC_CONTRACTS.TESTNET;
      const usdcContract = new Contract(usdcContractId);

      const toAddress = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3UBSIB3GN5QA';
      const amount = '10.00';
      const amountStroops = toStroops(amount);

      // Build transfer
      const hostFunction = usdcContract.call(
        'transfer',
        new Address(fromAddress).toScVal(),
        new Address(toAddress).toScVal(),
        nativeToScVal(amountStroops, { type: 'i128' })
      );

      const dummySource = new Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
      );

      const tx = new TransactionBuilder(dummySource, {
        fee: '100',
        networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();

      // Simulate
      const simulation = await server.simulateTransaction(tx);

      if ('error' in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const authEntries = simulation.result?.auth || [];
      const authEntryXdr =
        typeof authEntries[0] === 'string'
          ? authEntries[0]
          : authEntries[0].toXDR('base64');

      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR('base64');

      // Sign and submit
      const result = await window.rozo.signAuthEntry(authEntryXdr, {
        func: funcXdr,
        submit: true,
        message: `Transfer ${amount} USDC`,
      });

      alert(`Success! Transaction: ${result.hash}`);

      // Refresh balance
      const { balance: newBalance } = await window.rozo.getBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error('Payment failed:', error);
      if (!error.message.includes('User rejected')) {
        alert(`Error: ${error.message}`);
      }
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
      <p>Balance: {balance ? (BigInt(balance) / 10_000_000n).toString() : '-'} USDC</p>
      <button onClick={handlePay} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Pay $10 USDC'}
      </button>
    </div>
  );
}

export default PaymentButton;
```

## Key Points

### ✅ Always Use `submit: true`
```javascript
await window.rozo.signAuthEntry(authEntryXdr, {
  func: funcXdr,
  submit: true,  // ← This makes it gasless!
});
```

This submits via OpenZeppelin Relayer, making transactions gasless for users.

### ✅ Amount Conversion
USDC on Stellar has **7 decimals**:
- "1.00" USDC = 10,000,000 stroops
- "10.50" USDC = 105,000,000 stroops

```javascript
function toStroops(amount) {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(7, '0').slice(0, 7);
  return BigInt(whole + paddedDecimal);
}
```

### ✅ Error Handling
```javascript
try {
  await window.rozo.signAuthEntry(...);
} catch (error) {
  if (error.message.includes('User rejected')) {
    // User cancelled - don't show error
  } else if (error.message.includes('Insufficient balance')) {
    // Not enough USDC
  } else {
    // Other error
    console.error(error);
  }
}
```

### ✅ Network Detection
```javascript
const { network } = await window.rozo.getNetworkDetails();

const usdcAddress = network === 'PUBLIC'
  ? 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75'  // Mainnet
  : 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'; // Testnet
```

## Testing

1. **Install Rozo Wallet** mobile app (iOS/Android)
2. **Start your dev server** with HTTPS:
   ```bash
   npx ngrok http 3000
   ```
3. **Open your app** in Rozo Wallet's Explore tab
4. **Test on testnet** first before mainnet

## Support

- 📖 Provider Documentation: `/packages/native/core/src/webview/README.md`
- 💬 Discord: https://discord.gg/rozo
- 📧 Email: developers@rozo.ai

## Summary

To integrate "Pay with Rozo Wallet" for USDC transfers:

1. ✅ Detect `window.rozo` provider
2. ✅ Build USDC transfer transaction
3. ✅ Simulate to get auth entries
4. ✅ Call `window.rozo.signAuthEntry()` with `submit: true`
5. ✅ User confirms → biometric auth → gasless transaction!

That's it! The wallet handles all the security and gas fee sponsorship.
