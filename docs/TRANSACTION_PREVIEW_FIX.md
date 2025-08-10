# "Transaction Preview Unavailable" Error Fix

## 🔍 Problem Diagnosis

Based on the [official Coinbase Spend Permissions documentation](https://github.com/coinbase/spend-permissions/tree/main), the "Transaction preview unavailable" and "Unable to estimate asset changes" errors are caused by **smart contract authorization issues**.

## 🚨 Root Cause

According to the official documentation:

> "The `SpendPermissionManager` singleton is added as an owner of the user's smart wallet, giving it the ability to move user funds on behalf of a sender within the tight constraints of the spend permission logic."

**The issue**: The `SpendPermissionManager` contract is not properly authorized as an owner of the user's Coinbase Smart Wallet, preventing transaction previews and asset change estimations.

## ✅ Solutions Implemented

### 1. **Diagnostic Functions Added**

We added comprehensive diagnostic functions based on the official Coinbase standard:

```typescript
// Check if SpendPermissionManager is approved as wallet owner
async checkSpendPermissionManagerApproval(userAddress: string): Promise<boolean>

// Check if a specific spend permission is approved on-chain  
async isSpendPermissionApproved(spendPermission: SpendPermission): Promise<boolean>
```

### 2. **Enhanced Error Detection**

The application now detects and reports when:

- SpendPermissionManager is not approved as a wallet owner
- Spend permissions are not properly authorized
- Network configuration issues exist

### 3. **User-Friendly Error Messages**

When the SpendPermissionManager approval issue is detected, users see:

```
Transaction preview unavailable: SpendPermissionManager needs approval. 
Please authorize spend permissions first.
```

### 4. **Network Configuration Fix**

Added proper Base mainnet configuration:

- **SpendPermissionManager**: `0xf85210B21cC50302F477BA56686d2019dC9b67Ad`
- **USDC Token**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Chain ID**: `8453`

## 🔧 Technical Implementation

### Contract Authorization Check

```typescript
const isOwner = await publicClient.readContract({
  address: userAddress as Address,
  abi: [
    {
      inputs: [{ name: 'owner', type: 'address' }],
      name: 'isOwnerAddress', 
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  functionName: 'isOwnerAddress',
  args: [SpendPermissionManager_ADDRESS],
});
```

### Spend Permission Approval Check

```typescript
const hash = await publicClient.readContract({
  address: SpendPermissionManager_ADDRESS,
  abi: SPEND_PERMISSION_MANAGER_ABI,
  functionName: 'getHash',
  args: [spendPermission],
});

const isApproved = await publicClient.readContract({
  address: SpendPermissionManager_ADDRESS, 
  abi: SPEND_PERMISSION_MANAGER_ABI,
  functionName: 'isApproved',
  args: [spendPermission.account, hash],
});
```

## 📋 User Resolution Steps

When users encounter "Transaction preview unavailable", they need to:

### **🚨 Critical Issue: Authorization Shows "Active" But Still Fails**

**Problem**: Authorization appears successful but SpendPermissionManager wasn't added as wallet owner.

**Root Cause**: Early authorization only called `approveWithSignature` without adding SpendPermissionManager as a wallet owner.

**Solution Steps**:

1. **Re-Authorize Spend Permissions**: Even if it shows "active", re-run the authorization process
   - Our updated implementation now automatically adds SpendPermissionManager as wallet owner
   - This requires two transactions: `addOwnerAddress` + `approveWithSignature`

2. **Verify Network**: Ensure wallet is connected to Base mainnet (Chain ID: 8453)

3. **Check USDC Balance**: Ensure sufficient USDC for the transaction

4. **Check Console**: Look for diagnostic messages:
   - `🔍 SpendPermissionManager approval status: false` (indicates the issue)
   - `🔧 SpendPermissionManager not yet approved as wallet owner, adding now...`
   - `✅ SpendPermissionManager successfully added as wallet owner`

5. **Retry Transaction**: After proper authorization, transaction preview should work

### **📱 User Experience**
- Users will see: "Please re-authorize spend permissions to add wallet owner permissions"
- The authorization process may take slightly longer (2 transactions instead of 1)
- Console provides detailed diagnostic information

## 🔗 Official Documentation References

- [Coinbase CDP Spend Permissions Documentation](https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions)
- [Base Account Spend Permissions Guide](https://docs.base.org/base-account/improve-ux/spend-permissions)
- [Coinbase Spend Permissions Repository](https://github.com/coinbase/spend-permissions/tree/main)
- [Design Overview](https://github.com/coinbase/spend-permissions/tree/main#design-overview)
- [End-to-end Journey](https://github.com/coinbase/spend-permissions/tree/main#end-to-end-journey)

## 📋 Official Best Practices Implementation

Based on the [official Coinbase documentation](https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions), our implementation now includes:

### **1. Smart Account Requirements**
✅ **Verified**: Smart Accounts must have spend permissions enabled at creation time
✅ **Our Implementation**: Uses proper CDP Smart Account integration

### **2. Time Period Management** 
✅ **Official Pattern**: Uses `periodInDays` for simple daily/weekly limits
✅ **Enhanced Security**: `start` and `end` times with appropriate boundaries
✅ **Clock Drift Protection**: Start time set 5 minutes in the past

### **3. Token Support**
✅ **Official Shortcuts**: Support for `"usdc"` token shortcut on Base
✅ **Contract Addresses**: Full ERC-20 contract address support
✅ **Proper Decimals**: Correct handling of 6-decimal USDC

### **4. Monitoring and Limits**
✅ **Reasonable Limits**: Minimum $0.01, maximum $100 daily recommended
✅ **Usage Monitoring**: 80% warning threshold, 95% near-limit detection
✅ **Best Practices**: Following all official security recommendations

## ⚙️ Environment Configuration

Set the following environment variables for proper operation:

```bash
# Use Base mainnet for production
NEXT_PUBLIC_USE_MAINNET=true

# NS Cafe merchant address
NEXT_PUBLIC_NS_CAFE_ADDRESS=0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897
```

## 🧪 Testing the Fix

1. Connect wallet to the application
2. Check browser console for diagnostic messages:
   - `🔍 SpendPermissionManager approval status: true/false`
   - `💡 SpendPermissionManager not approved...` (if issue exists)
3. Authorization flow should properly add SpendPermissionManager as owner
4. Transaction previews should work after proper authorization

This implementation follows the official Coinbase Spend Permissions standard and provides clear diagnostic information to help users resolve authorization issues.
