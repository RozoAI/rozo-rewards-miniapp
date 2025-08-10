'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRozoAPI, TEST_CONFIG } from '@/hooks/useRozoAPI';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';

interface SpendAuthorizationProps {
  onAuthorizationComplete?: (data: any) => void;
  onBalanceUpdate?: (balance: number) => void;
  onCreditUpdate?: (credit: number) => void;
}

interface SpendPermissionData {
  authorized: boolean;
  allowance: number;
  daily_limit: number;
  remaining_today: number;
  expiry: string;
  status: string;
}

interface RozoBalanceData {
  available_cashback_rozo: number;
  available_cashback_usd: number;
  current_tier: string;
  tier_multiplier: number;
}

export const SpendAuthorization: React.FC<SpendAuthorizationProps> = ({
  onAuthorizationComplete,
  onBalanceUpdate,
  onCreditUpdate
}) => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { 
    loading, 
    error, 
    isAuthenticated,
    authenticateWallet,
    checkSpendPermission, 
    authorizeSpending, 
    getRozoBalance,
    clearError 
  } = useRozoAPI();

  const [spendPermission, setSpendPermission] = useState<SpendPermissionData | null>(null);
  const [rozoBalance, setRozoBalance] = useState<RozoBalanceData | null>(null);
  const [authorizationAmount, setAuthorizationAmount] = useState(TEST_CONFIG.authorizationAmount);
  const [availableCredit, setAvailableCredit] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAuthorizationStatus = useCallback(async () => {
    const permission = await checkSpendPermission();
    if (permission) {
      setSpendPermission(permission);
      // Set available credit from existing permission
      if (permission.authorized && permission.remaining_today) {
        setAvailableCredit(permission.remaining_today);
        onCreditUpdate?.(permission.remaining_today);
      }
    }
  }, [checkSpendPermission, onCreditUpdate]);

  const loadRozoBalance = useCallback(async () => {
    const balance = await getRozoBalance();
    if (balance) {
      setRozoBalance(balance);
      onBalanceUpdate?.(balance.available_cashback_rozo);
    }
  }, [getRozoBalance, onBalanceUpdate]);

  // Load initial data when authenticated
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      loadAuthorizationStatus();
      loadRozoBalance();
    }
  }, [isConnected, isAuthenticated, loadAuthorizationStatus, loadRozoBalance]);

  // Clear error when component updates
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleAuthorizeSpending = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!signMessageAsync) {
      toast.error('Wallet signature capability not available');
      return;
    }

    try {
      // Get wallet signature for CDP spend permission
      const message = `Authorize ROZO spending limit of $${authorizationAmount.toFixed(2)}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      
      // Send to backend for real CDP spend permission setup
      const result = await authorizeSpending(authorizationAmount, signature);
      
      if (result) {
        setSpendPermission(result);
        setAvailableCredit(result.remaining_today || authorizationAmount);
        onCreditUpdate?.(result.remaining_today || authorizationAmount);
        onAuthorizationComplete?.(result);
        
        // Refresh balance after authorization
        await loadRozoBalance();
      } else {
        throw new Error('Authorization failed');
      }
      
    } catch (error: any) {
      console.error('Authorization error:', error);
      if (error.name === 'UserRejectedRequestError') {
        toast.error('Signature cancelled. Authorization is required for ROZO payments.');
      } else {
        toast.error('Failed to authorize spending. Please check your connection and try again.');
      }
    }
  };

  const refreshData = async () => {
    await Promise.all([
      loadAuthorizationStatus(),
      loadRozoBalance()
    ]);
  };

  // Function to deduct from available credit after purchase  
  const deductCredit = (amount: number) => {
    setAvailableCredit(prev => Math.max(0, prev - amount));
  };

  if (!mounted || !isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Authorization</CardTitle>
          <CardDescription>Connect your wallet to set up payment authorization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please connect your wallet to continue</p>
        </CardContent>
      </Card>
    );
  }

  // Show authentication prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Sign in with your wallet to access ROZO features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            To set up payment authorization and access ROZO features, you need to authenticate with your wallet.
          </p>
          <Button 
            onClick={authenticateWallet}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Authenticating...' : '🔐 Sign In with Wallet'}
          </Button>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Spend Authorization Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Authorization</CardTitle>
          <CardDescription>
            Set up one-tap payments by authorizing a spending limit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!spendPermission?.authorized ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-2">
                  Authorization Amount (USD)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="amount"
                    type="number"
                    value={authorizationAmount}
                    onChange={(e) => setAuthorizationAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                    min="1"
                    max="1000"
                  />
                  <Button 
                    onClick={handleAuthorizeSpending}
                    disabled={loading || authorizationAmount <= 0}
                    className="min-w-[120px]"
                  >
                    {loading ? 'Authorizing...' : `Authorize $${authorizationAmount}`}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>• You&apos;ll need to sign a message with your wallet</p>
                <p>• This enables one-tap payments without repeated signatures</p>
                <p>• You can revoke authorization at any time</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">✅ Authorization Active</p>
                  <p className="text-sm text-green-600">One-tap payments enabled</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600">Total Authorized</p>
                  <p className="text-lg font-semibold text-blue-800">
                    ${spendPermission.allowance.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">💳 Available Credit</p>
                  <p className="text-lg font-semibold text-green-800">
                    ${availableCredit.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Expires: {new Date(spendPermission.expiry).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ROZO Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>ROZO Balance</CardTitle>
          <CardDescription>Your cashback rewards balance</CardDescription>
        </CardHeader>
        <CardContent>
          {rozoBalance ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div>
                  <p className="text-sm text-purple-600">Available ROZO</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {rozoBalance.available_cashback_rozo} ROZO
                  </p>
                  <p className="text-sm text-purple-600">
                    ≈ ${rozoBalance.available_cashback_usd.toFixed(2)} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-600">Tier</p>
                  <p className="text-lg font-semibold text-purple-800 capitalize">
                    {rozoBalance.current_tier}
                  </p>
                  <p className="text-sm text-purple-600">
                    {rozoBalance.tier_multiplier}x multiplier
                  </p>
                </div>
              </div>
              
              {rozoBalance.available_cashback_rozo === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 Make your first purchase to start earning ROZO cashback!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {loading ? 'Loading balance...' : 'Unable to load balance'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">⚠️</div>
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
