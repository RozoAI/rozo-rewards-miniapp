/**
 * Coinbase CDP (Commerce Developer Platform) Configuration
 * Based on: https://github.com/coinbase/spend-permissions
 */

import { Address } from 'viem';

// Contract addresses on different networks
export const CDP_CONTRACTS = {
  // Base Mainnet
  8453: {
    SpendPermissionManager: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address,
    PublicERC6492Validator: '0xcfCE48B757601F3f351CB6f434CB0517aEEE293D' as Address,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  },
  // Base Sepolia (Testnet)
  84532: {
    SpendPermissionManager: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address,
    PublicERC6492Validator: '0xcfCE48B757601F3f351CB6f434CB0517aEEE293D' as Address,
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // Base Sepolia USDC
  }
} as const;

// Network configuration
export const SUPPORTED_NETWORKS = {
  MAINNET: 8453,   // Base
  TESTNET: 84532,  // Base Sepolia
} as const;

// Current network (use mainnet for real deployment)
export const CURRENT_NETWORK = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'
  ? SUPPORTED_NETWORKS.MAINNET 
  : SUPPORTED_NETWORKS.TESTNET;

// Get contracts for current network
export const getCurrentContracts = () => {
  return CDP_CONTRACTS[CURRENT_NETWORK];
};

// EIP-712 Domain for Spend Permissions
export const SPEND_PERMISSION_DOMAIN = {
  name: 'SpendPermission',
  version: '1',
  chainId: CURRENT_NETWORK,
  verifyingContract: getCurrentContracts().SpendPermissionManager,
} as const;

// EIP-712 Types for Spend Permissions
export const SPEND_PERMISSION_TYPES = {
  SpendPermission: [
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
} as const;

// Our Rozo PayMaster address (to be deployed)
export const ROZO_PAYMASTER_ADDRESS = process.env.NEXT_PUBLIC_ROZO_PAYMASTER_ADDRESS as Address || 
  '0x0000000000000000000000000000000000000000' as Address;

// NS Cafe merchant address (Base mainnet)
export const NS_CAFE_ADDRESS = process.env.NEXT_PUBLIC_NS_CAFE_ADDRESS as Address || 
  '0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897' as Address; // Real NS Cafe address

// Default spend permission parameters
export const DEFAULT_SPEND_PERMISSION = {
  period: 86400, // 24 hours in seconds
  maxAllowance: 1000, // $1000 USD maximum
  defaultAllowance: 20, // $20 USD default
} as const;

export type NetworkId = keyof typeof CDP_CONTRACTS;
export type ContractAddresses = typeof CDP_CONTRACTS[NetworkId];
