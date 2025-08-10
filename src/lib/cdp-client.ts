/**
 * Coinbase CDP Client for Spend Permissions
 * Implements real blockchain integration for ROZO payments
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  Address, 
  parseUnits, 
  formatUnits,
  Hex,
  custom
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { 
  getCurrentContracts, 
  CURRENT_NETWORK, 
  SPEND_PERMISSION_DOMAIN, 
  SPEND_PERMISSION_TYPES,
  ROZO_PAYMASTER_ADDRESS,
  DEFAULT_SPEND_PERMISSION
} from './cdp-config';

// ABI for SpendPermissionManager contract
const SPEND_PERMISSION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'account', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'allowance', type: 'uint256' },
          { name: 'period', type: 'uint48' },
          { name: 'start', type: 'uint48' },
          { name: 'end', type: 'uint48' },
          { name: 'salt', type: 'uint256' },
          { name: 'extraData', type: 'bytes' },
        ],
        name: 'spendPermission',
        type: 'tuple',
      },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'approveWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'account', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'allowance', type: 'uint256' },
          { name: 'period', type: 'uint48' },
          { name: 'start', type: 'uint48' },
          { name: 'end', type: 'uint48' },
          { name: 'salt', type: 'uint256' },
          { name: 'extraData', type: 'bytes' },
        ],
        name: 'spendPermission',
        type: 'tuple',
      },
      { name: 'value', type: 'uint256' },
    ],
    name: 'spend',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'start', type: 'uint48' },
      { name: 'period', type: 'uint48' },
    ],
    name: 'getCurrentPeriod',
    outputs: [{ type: 'uint48' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'period', type: 'uint48' },
    ],
    name: 'getSpent',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'account', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'allowance', type: 'uint256' },
          { name: 'period', type: 'uint48' },
          { name: 'start', type: 'uint48' },
          { name: 'end', type: 'uint48' },
          { name: 'salt', type: 'uint256' },
          { name: 'extraData', type: 'bytes' },
        ],
        name: 'spendPermission',
        type: 'tuple',
      },
    ],
    name: 'getHash',
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'hash', type: 'bytes32' },
    ],
    name: 'isApproved',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// USDC Contract ABI (minimal)
const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Get the appropriate chain config
const getChain = () => {
  return CURRENT_NETWORK === 8453 ? base : baseSepolia;
};

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: getChain(),
  transport: http(),
});

// SpendPermission interface
export interface SpendPermission {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: Hex;
}

// CDP Client class
export class CDPClient {
  private contracts = getCurrentContracts();

  /**
   * Create a spend permission for user authorization
   */
  async createSpendPermission(
    userAddress: Address,
    allowanceUSD: number,
    durationHours: number = 24
  ): Promise<SpendPermission> {
    const allowanceWei = parseUnits(allowanceUSD.toString(), 6); // USDC has 6 decimals
    const now = Math.floor(Date.now() / 1000);
    const period = durationHours * 3600; // Convert hours to seconds
    
    return {
      account: userAddress,
      spender: ROZO_PAYMASTER_ADDRESS,
      token: this.contracts.USDC,
      allowance: allowanceWei,
      period,
      start: now,
      end: now + (period * 365), // Valid for 1 year
      salt: BigInt(Math.floor(Math.random() * 1000000)),
      extraData: '0x',
    };
  }

  /**
   * Get EIP-712 typed data for spend permission signing
   */
  getTypedDataForSigning(spendPermission: SpendPermission) {
    return {
      domain: SPEND_PERMISSION_DOMAIN,
      types: SPEND_PERMISSION_TYPES,
      primaryType: 'SpendPermission',
      message: spendPermission,
    };
  }

  /**
   * Check user's USDC balance
   */
  async getUSDCBalance(userAddress: Address): Promise<number> {
    try {
      const balance = await publicClient.readContract({
        address: this.contracts.USDC,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });
      
      return parseFloat(formatUnits(balance, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error('Error checking USDC balance:', error);
      return 0;
    }
  }

  /**
   * Check current spending in the current period
   */
  async getCurrentSpending(
    userAddress: Address,
    spenderAddress: Address = ROZO_PAYMASTER_ADDRESS
  ): Promise<number> {
    try {
      const currentPeriod = await publicClient.readContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'getCurrentPeriod',
        args: [
          userAddress,
          spenderAddress,
          this.contracts.USDC,
          Math.floor(Date.now() / 1000) - DEFAULT_SPEND_PERMISSION.period, // start time (24h ago)
          DEFAULT_SPEND_PERMISSION.period,
        ],
      });

      const spent = await publicClient.readContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'getSpent',
        args: [
          userAddress,
          spenderAddress,
          this.contracts.USDC,
          currentPeriod,
        ],
      });

      return parseFloat(formatUnits(spent, 6));
    } catch (error) {
      console.error('Error checking current spending:', error);
      // For testing purposes, if the contract call fails, assume no current spending
      // This commonly happens when no spend permission has been created yet for this user
      console.log('💡 No existing spend permission found for this user - returning 0 spent');
      return 0;
    }
  }

  /**
   * Approve spend permission on-chain
   */
  async approveSpendPermission(
    spendPermission: SpendPermission,
    signature: Hex,
    walletClient?: any
  ): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for transaction');
    }

    try {
      const hash = await walletClient.writeContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'approveWithSignature',
        args: [spendPermission, signature],
      });

      return hash;
    } catch (error) {
      console.error('Error approving spend permission:', error);
      throw error;
    }
  }

  /**
   * Execute spend with automatic approval (Coinbase Spend Permissions standard)
   * Implements the official two-step flow: approveWithSignature -> spend
   */
  async executeSpendWithApproval(
    spendPermission: SpendPermission,
    signature: Hex,
    amountUSD: number,
    walletClient?: any
  ): Promise<{ approvalTxHash?: Hex; spendTxHash: Hex }> {
    if (!walletClient) {
      throw new Error('Wallet client required for transaction');
    }

    const amountWei = parseUnits(amountUSD.toString(), 6);

    try {
      console.log(`🎯 Executing Coinbase Spend Permissions standard flow for $${amountUSD}...`);
      console.log('🔍 SpendPermission details:', spendPermission);

      // Step 1: Approve with signature (if needed)
      let approvalTxHash: Hex | undefined;
      
      try {
        console.log('📝 Step 1: Approving spend permission with signature...');
        approvalTxHash = await walletClient.writeContract({
          address: this.contracts.SpendPermissionManager,
          abi: SPEND_PERMISSION_MANAGER_ABI,
          functionName: 'approveWithSignature',
          args: [spendPermission, signature],
        });
        
        console.log('✅ Approval transaction submitted:', approvalTxHash);
        
        // Wait for approval confirmation
        if (approvalTxHash) {
          await this.waitForTransaction(approvalTxHash);
          console.log('✅ Spend permission approved on-chain');
        }
      } catch (approvalError) {
        console.log('⚠️ Approval may already exist or failed:', approvalError);
        // Continue to spend step even if approval fails (permission might already exist)
      }

      // Step 2: Execute spend
      console.log('💸 Step 2: Executing spend transaction...');
      const spendTxHash = await walletClient.writeContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'spend',
        args: [spendPermission, amountWei],
      });

      console.log('✅ Spend transaction submitted:', spendTxHash);
      return { approvalTxHash, spendTxHash };
    } catch (error) {
      console.error('❌ Error executing spend with approval:', error);
      throw error;
    }
  }

  /**
   * Execute a spend (payment) using approved permission (legacy method)
   */
  async executeSpend(
    spendPermission: SpendPermission,
    amountUSD: number,
    walletClient?: any
  ): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for transaction');
    }

    const amountWei = parseUnits(amountUSD.toString(), 6);

    try {
      console.log(`💸 Executing spend of $${amountUSD} (${amountWei} wei)...`);
      console.log('🔍 SpendPermission details:', spendPermission);

      const hash = await walletClient.writeContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'spend',
        args: [spendPermission, amountWei],
      });

      console.log('✅ Spend transaction submitted:', hash);
      return hash;
    } catch (error) {
      console.error('❌ Error executing spend:', error);
      throw error;
    }
  }

  /**
   * Execute direct USDC transfer (fallback method)
   */
  async executeDirectUSDCTransfer(
    toAddress: Address,
    amountUSD: number,
    walletClient?: any
  ): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for transaction');
    }

    const amountWei = parseUnits(amountUSD.toString(), 6);

    try {
      console.log(`💸 Executing direct USDC transfer of $${amountUSD} to ${toAddress}...`);

      const hash = await walletClient.writeContract({
        address: this.contracts.USDC,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [toAddress, amountWei],
      });

      console.log('✅ USDC transfer transaction submitted:', hash);
      return hash;
    } catch (error) {
      console.error('❌ Error executing USDC transfer:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: Hex): Promise<any> {
    try {
      console.log(`⏳ Waiting for transaction confirmation: ${txHash}`);
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000, // 60 seconds timeout
      });

      console.log('✅ Transaction confirmed:', receipt);
      return receipt;
    } catch (error) {
      console.error('❌ Transaction confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Validate spend permission status
   */
  async validateSpendPermission(
    userAddress: Address,
    allowanceUSD: number
  ): Promise<{
    isValid: boolean;
    currentSpending: number;
    remaining: number;
    usdcBalance: number;
  }> {
    const [currentSpending, usdcBalance] = await Promise.all([
      this.getCurrentSpending(userAddress),
      this.getUSDCBalance(userAddress),
    ]);

    const remaining = Math.max(0, allowanceUSD - currentSpending);
    const isValid = remaining > 0 && usdcBalance >= remaining;

    return {
      isValid,
      currentSpending,
      remaining,
      usdcBalance,
    };
  }

  /**
   * Check if SpendPermissionManager is approved as an owner of the user's smart wallet
   * This is required according to Coinbase Spend Permissions documentation
   * Reference: https://github.com/coinbase/spend-permissions/tree/main
   */
  async checkSpendPermissionManagerApproval(userAddress: string): Promise<boolean> {
    try {
      // Check if SpendPermissionManager is an owner of the user's wallet
      // This uses the Coinbase Smart Wallet interface
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
        args: [this.contracts.SpendPermissionManager],
      }) as boolean;

      console.log(`🔍 SpendPermissionManager approval status for ${userAddress}: ${isOwner}`);
      
      if (!isOwner) {
        console.warn(`⚠️ SpendPermissionManager is not approved as owner for wallet ${userAddress}`);
        console.log('💡 User needs to add SpendPermissionManager as an owner to their smart wallet');
      }
      
      return isOwner;
    } catch (error) {
      console.error('Error checking SpendPermissionManager approval:', error);
      // If we can't check, assume it's not approved to be safe
      return false;
    }
  }

  /**
   * Check if a spend permission is already approved on-chain
   * Reference: https://github.com/coinbase/spend-permissions/tree/main
   */
  async isSpendPermissionApproved(spendPermission: SpendPermission): Promise<boolean> {
    try {
      const hash = await publicClient.readContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'getHash',
        args: [spendPermission as any],
      }) as Hex;

      const isApproved = await publicClient.readContract({
        address: this.contracts.SpendPermissionManager,
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: 'isApproved',
        args: [spendPermission.account, hash],
      }) as boolean;

      console.log(`🔍 Spend permission approval status: ${isApproved}`);
      return isApproved;
    } catch (error) {
      console.error('Error checking spend permission approval:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cdpClient = new CDPClient();

// Helper function to create wallet client from window.ethereum
export const createWalletClientFromWindow = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum wallet not available');
  }

  return createWalletClient({
    chain: getChain(),
    transport: custom(window.ethereum),
    account: undefined, // Will be automatically detected from connected wallet
  });
};
