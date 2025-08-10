/**
 * Hook for managing real Coinbase CDP Spend Permissions
 * Handles EIP-712 signatures and blockchain interactions
 */

import { useCallback, useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { Address, Hex, createWalletClient, custom, Chain } from 'viem';
import { cdpClient, SpendPermission, createWalletClientFromWindow } from '@/lib/cdp-client';
import { NS_CAFE_ADDRESS, getChain } from '@/lib/cdp-config';
import { toast } from 'sonner';

interface CDPPermissionState {
  loading: boolean;
  error: string | null;
  isAuthorized: boolean;
  currentPermission: SpendPermission | null;
}

// Helper function to ensure wallet is on correct network with improved error handling
async function ensureCorrectNetwork() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum wallet not available');
  }

  const targetChain = getChain();
  console.log(`🔍 Network check: Target ${targetChain.name} (Chain ID: ${targetChain.id})`);
  
  try {
    // Check current chain ID
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainDecimal = parseInt(currentChainId, 16);
    
    if (currentChainDecimal !== targetChain.id) {
      console.log(`⚠️ Network mismatch! Current: ${currentChainDecimal}, Required: ${targetChain.id}`);
      console.log(`🔄 Requesting switch to ${targetChain.name}...`);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
      });
      
      console.log(`✅ Successfully switched to ${targetChain.name}`);
      // Wait for network switch to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`✅ Already on correct network: ${targetChain.name}`);
    }
    
    // Double-check ETH balance for gas fees
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [await window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => accounts[0]), 'latest']
    });
    
    const balanceInEth = parseInt(balance, 16) / 1e18;
    if (balanceInEth < 0.001) {
      throw new Error(`Insufficient ETH for gas fees. You have ${balanceInEth.toFixed(6)} ETH, but need at least 0.001 ETH. Please add ETH to your wallet on ${targetChain.name}.`);
    }
    
  } catch (error: any) {
    console.error('❌ Network setup error:', error);
    
    if (error.code === 4902) {
      // Chain not added to wallet
      console.log(`➕ Adding ${targetChain.name} to wallet...`);
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${targetChain.id.toString(16)}`,
            chainName: targetChain.name,
            nativeCurrency: targetChain.nativeCurrency,
            rpcUrls: targetChain.rpcUrls.default.http,
            blockExplorerUrls: [targetChain.blockExplorers.default.url],
          }],
        });
        console.log(`✅ ${targetChain.name} added successfully`);
      } catch (addError) {
        throw new Error(`Failed to add ${targetChain.name} to wallet. Please add it manually.`);
      }
    } else if (error.code === 4001) {
      throw new Error(`Please approve the network switch to ${targetChain.name} in your wallet`);
    } else if (error.message?.includes('Insufficient ETH')) {
      throw error; // Re-throw balance errors as-is
    } else {
      throw new Error(`Network setup failed: ${error.message}. Please manually switch to ${targetChain.name} and ensure you have ETH for gas fees.`);
    }
  }
}

export const useCDPPermissions = () => {
  const [state, setState] = useState<CDPPermissionState>({
    loading: false,
    error: null,
    isAuthorized: false,
    currentPermission: null,
  });

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  // Create and sign a spend permission
  const createSpendPermission = useCallback(async (
    allowanceUSD: number,
    durationHours: number = 24
  ): Promise<{ permission: SpendPermission; signature: Hex } | null> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔐 Creating CDP spend permission...');

      // Create spend permission
      const spendPermission = await cdpClient.createSpendPermission(
        address,
        allowanceUSD,
        durationHours
      );

      // Get EIP-712 typed data
      const typedData = cdpClient.getTypedDataForSigning(spendPermission);

      console.log('📝 Signing EIP-712 typed data...', typedData);

      // Sign with EIP-712
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: 'SpendPermission' as const,
        message: typedData.message,
      });

      console.log('✅ EIP-712 signature created successfully');

      setState(prev => ({
        ...prev,
        loading: false,
        isAuthorized: true,
        currentPermission: spendPermission,
      }));

      return { permission: spendPermission, signature };

    } catch (error: any) {
      console.error('❌ Failed to create spend permission:', error);
      
      const errorMessage = error.name === 'UserRejectedRequestError' 
        ? 'Signature cancelled by user'
        : `Failed to create spend permission: ${error.message}`;

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [isConnected, address, signTypedDataAsync]);

  // Submit spend permission to blockchain
  const submitSpendPermission = useCallback(async (
    spendPermission: SpendPermission,
    signature: Hex
  ): Promise<Hex | null> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🚀 Submitting spend permission to blockchain...');

      // Ensure wallet is properly setup (correct network, sufficient ETH)
      await ensureCorrectNetwork();
      
      // Get connected accounts from ethereum provider
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      
      // Create wallet client
      const targetChain = getChain();
      const walletClient = createWalletClient({
        chain: targetChain as Chain,
        transport: custom(window.ethereum),
        account: accounts[0] as Address, // Use the first connected account
      });

      // Submit to SpendPermissionManager contract
      const txHash = await cdpClient.approveSpendPermission(
        spendPermission,
        signature,
        walletClient
      );

      console.log('✅ Spend permission submitted successfully:', txHash);

      setState(prev => ({
        ...prev,
        loading: false,
        isAuthorized: true,
        currentPermission: spendPermission,
      }));

      toast.success('Spend permission authorized on-chain!');
      return txHash;

    } catch (error: any) {
      console.error('❌ Failed to submit spend permission:', error);
      
      let errorMessage = 'Failed to submit spend permission';
      
      // Handle user rejection specifically
      if (error.message?.includes('User rejected') || 
          error.message?.includes('User denied') ||
          error.message?.includes('rejected') ||
          error.details?.includes('User denied transaction signature')) {
        errorMessage = 'Transaction was cancelled. Please try again if you want to authorize spending.';
      } else {
        errorMessage = `Failed to submit spend permission: ${error.message}`;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isConnected, address]);

  // Execute a spend using the permission
  const executeSpend = useCallback(async (
    spendPermission: SpendPermission,
    amountUSD: number
  ): Promise<Hex | null> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`💸 Executing spend of $${amountUSD}...`);

      // Create wallet client
      const walletClient = createWalletClientFromWindow();

      // Execute spend through SpendPermissionManager
      const txHash = await cdpClient.executeSpend(
        spendPermission,
        amountUSD,
        walletClient
      );

      console.log('✅ Spend executed successfully:', txHash);

      setState(prev => ({ ...prev, loading: false }));

      toast.success(`Payment of $${amountUSD} processed successfully!`);
      return txHash;

    } catch (error: any) {
      console.error('❌ Failed to execute spend:', error);
      
      const errorMessage = `Failed to execute payment: ${error.message}`;
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isConnected, address]);

  // Check current spend permission status
  const checkPermissionStatus = useCallback(async (): Promise<{
    isValid: boolean;
    currentSpending: number;
    remaining: number;
    usdcBalance: number;
    isManagerApproved?: boolean;
  } | null> => {
    if (!isConnected || !address) {
      return null;
    }

    try {
      // Step 1: Check if SpendPermissionManager is approved as owner (critical requirement)
      const isManagerApproved = await cdpClient.checkSpendPermissionManagerApproval(address);
      
      if (!isManagerApproved) {
        console.warn('⚠️ SpendPermissionManager is not approved as owner of the smart wallet');
        console.log('💡 This is likely the cause of "Transaction preview unavailable" errors');
        console.log('📝 Reference: https://github.com/coinbase/spend-permissions/tree/main');
      }

      // Step 2: Validate spend permission normally
      const status = await cdpClient.validateSpendPermission(address, 20); // Check for $20 allowance
      
      return {
        ...status,
        isManagerApproved, // Add this critical flag
      };
    } catch (error) {
      console.error('Failed to check permission status:', error);
      // In simplified mode, return a default state indicating no permissions set up yet
      try {
        const usdcBalance = await cdpClient.getUSDCBalance(address);
        return {
          isValid: false,
          currentSpending: 0,
          remaining: 0,
          usdcBalance,
          isManagerApproved: false,
        };
      } catch (balanceError) {
        console.error('Error getting USDC balance:', balanceError);
        return {
          isValid: false,
          currentSpending: 0,
          remaining: 0,
          usdcBalance: 0,
          isManagerApproved: false,
        };
      }
    }
  }, [isConnected, address]);

  // Check user's USDC balance
  const checkUSDCBalance = useCallback(async (): Promise<number> => {
    if (!isConnected || !address) {
      return 0;
    }

    try {
      return await cdpClient.getUSDCBalance(address);
    } catch (error) {
      console.error('Failed to check USDC balance:', error);
      return 0;
    }
  }, [isConnected, address]);

  // Execute payment to NS Cafe using CDP spend permission
  const payNSCafe = useCallback(async (
    spendPermission: SpendPermission,
    amountUSD: number
  ): Promise<{ txHash: Hex; receipt: any } | null> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`☕ Processing NS Cafe payment of $${amountUSD}...`);

      // Create wallet client
      const walletClient = createWalletClientFromWindow();

      // Option 1: Try to use CDP spend permission
      let txHash: Hex;
      try {
        txHash = await cdpClient.executeSpend(spendPermission, amountUSD, walletClient);
        console.log('✅ Payment executed via CDP spend permission');
      } catch (spendError) {
        console.log('⚠️ CDP spend failed, trying direct USDC transfer...');
        // Option 2: Fallback to direct USDC transfer
        txHash = await cdpClient.executeDirectUSDCTransfer(NS_CAFE_ADDRESS, amountUSD, walletClient);
        console.log('✅ Payment executed via direct USDC transfer');
      }

      // Wait for transaction confirmation
      const receipt = await cdpClient.waitForTransaction(txHash);

      setState(prev => ({ ...prev, loading: false }));

      toast.success(`NS Cafe payment successful! $${amountUSD} sent`);
      return { txHash, receipt };

    } catch (error: any) {
      console.error('❌ NS Cafe payment failed:', error);
      
      const errorMessage = `Payment failed: ${error.message}`;
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isConnected, address]);

  // Execute payment with automatic ROZO earning using Coinbase Spend Permissions standard
  const payWithROZORewards = useCallback(async (
    spendPermission: SpendPermission | null,
    amountUSD: number,
    onSuccess?: (result: { txHash: Hex; receipt: any; rozoEarned: number }) => void
  ): Promise<{ txHash: Hex; receipt: any; rozoEarned: number } | null> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let signature: Hex | undefined;
      
      if (spendPermission) {
        console.log(`🎯 Starting Coinbase Spend Permissions standard payment flow...`);

        // Step 1: Get user signature for spend permission
        const typedData = cdpClient.getTypedDataForSigning(spendPermission);
        
        console.log('📝 Requesting user signature for spend permission...');
        signature = await signTypedDataAsync({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: 'SpendPermission' as const,
          message: typedData.message,
        });

        console.log('✅ User signature obtained');
      } else {
        console.log('💳 Using existing spend permission for direct payment...');
      }

      // Step 2: Create wallet client and execute standard flow
      if (!address) {
        throw new Error('Wallet not connected');
      }
      
      // Ensure wallet is properly setup (correct network, sufficient ETH)
      await ensureCorrectNetwork();
      
      // Get connected accounts from ethereum provider
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      
      const targetChain = getChain();
      const walletClient = createWalletClient({
        chain: targetChain as Chain,
        transport: custom(window.ethereum),
        account: accounts[0] as Address, // Use the first connected account
      });
      
      let result: { approvalTxHash?: Hex; spendTxHash: Hex };
      
      if (spendPermission && signature) {
        // Full flow: approve + spend
        result = await cdpClient.executeSpendWithApproval(
          spendPermission,
          signature,
          amountUSD,
          walletClient
        );
      } else {
        // Direct spend using existing authorization
        console.log('💸 Executing direct spend with existing authorization...');
        // For simplified flow, we need to create a temporary spend permission structure
        // This should use the previously authorized spend permission
        const tempSpendPermission = await cdpClient.createSpendPermission(address, 20, 24); // Use the $20 authorization
        const spendTxHash = await cdpClient.executeSpend(tempSpendPermission, amountUSD, walletClient);
        result = { spendTxHash };
      }

      // Wait for final transaction confirmation
      const receipt = await cdpClient.waitForTransaction(result.spendTxHash);

      // Calculate ROZO rewards (payment amount * 10)
      const rozoEarned = amountUSD * 10;

      console.log(`🎉 Coinbase Spend Permissions payment successful! Earned ${rozoEarned} ROZO`);

      setState(prev => ({ ...prev, loading: false }));

      const finalResult = {
        txHash: result.spendTxHash,
        receipt,
        rozoEarned
      };

      toast.success(`Payment successful via Coinbase Spend Permissions! $${amountUSD} sent`);
      onSuccess?.(finalResult);
      return finalResult;

    } catch (error: any) {
      console.error('❌ Coinbase Spend Permissions payment failed:', error);
      
      let errorMessage = 'Payment failed';
      
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' ||
          error.message?.includes('User rejected') || 
          error.message?.includes('User denied') ||
          error.message?.includes('rejected') ||
          error.details?.includes('User denied transaction signature')) {
        errorMessage = 'Payment was cancelled. Please try again to complete the payment.';
      } else {
        errorMessage = `Payment failed: ${error.message}`;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isConnected, address, signTypedDataAsync]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createSpendPermission,
    submitSpendPermission,
    executeSpend,
    payNSCafe,
    payWithROZORewards,
    checkPermissionStatus,
    checkUSDCBalance,
    clearError,
  };
};
