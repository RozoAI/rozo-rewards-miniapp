/**
 * Hook for managing real Coinbase CDP Spend Permissions
 * Handles EIP-712 signatures and blockchain interactions
 */

import { useCallback, useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { Address, Hex } from 'viem';
import { cdpClient, SpendPermission, createWalletClientFromWindow } from '@/lib/cdp-client';
import { toast } from 'sonner';

interface CDPPermissionState {
  loading: boolean;
  error: string | null;
  isAuthorized: boolean;
  currentPermission: SpendPermission | null;
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

      // Create wallet client
      const walletClient = createWalletClientFromWindow();

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
      
      const errorMessage = `Failed to submit spend permission: ${error.message}`;
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
  } | null> => {
    if (!isConnected || !address) {
      return null;
    }

    try {
      const status = await cdpClient.validateSpendPermission(address, 20); // Check for $20 allowance
      return status;
    } catch (error) {
      console.error('Failed to check permission status:', error);
      return null;
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

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createSpendPermission,
    submitSpendPermission,
    executeSpend,
    checkPermissionStatus,
    checkUSDCBalance,
    clearError,
  };
};
