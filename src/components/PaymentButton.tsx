'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRozoAPI } from '@/hooks/useRozoAPI';
import { useCDPPermissions } from '@/hooks/useCDPPermissions';
import { cdpClient } from '@/lib/cdp-client';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

interface PaymentButtonProps {
  merchant: string;
  merchantName: string;
  merchantWallet: string;
  amount: number;
  cashbackRate: number;
  onPaymentSuccess?: (data: any) => void;
  disabled?: boolean;
  className?: string;
  simpleMode?: boolean; // New prop for simplified mode without authentication
}

interface PaymentEligibility {
  eligible: boolean;
  payment_method: string;
  allowance_remaining?: number;
  spend_permission?: {
    authorized: boolean;
    remaining_today: number;
  };
  cashback_preview?: {
    estimated_rozo: number;
    estimated_usd: number;
    final_rate: number;
  };
  recommendations?: string[];
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  merchant,
  merchantName,
  merchantWallet,
  amount,
  cashbackRate,
  onPaymentSuccess,
  disabled = false,
  className = "",
  simpleMode = false
}) => {
  const { 
    loading, 
    error, 
    isAuthenticated,
    checkPaymentEligibility, 
    processPayment,
    clearError 
  } = useRozoAPI();

  // CDP Permissions for real blockchain payments
  const {
    loading: cdpLoading,
    error: cdpError,
    payWithROZORewards,
    checkUSDCBalance,
    checkPermissionStatus,
    clearError: clearCDPError
  } = useCDPPermissions();

  const { address, isConnected } = useAccount();

  const [eligibility, setEligibility] = useState<PaymentEligibility | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const checkEligibility = useCallback(async () => {
    const result = await checkPaymentEligibility(amount, false);
    if (result) {
      setEligibility(result);
    }
  }, [checkPaymentEligibility, amount]);

  // Check payment eligibility when authenticated and amount changes (skip in simple mode)
  useEffect(() => {
    if (simpleMode) {
      // In simple mode, assume payment is eligible
      setEligibility({
        eligible: true,
        payment_method: 'direct_usdc',
        allowance_remaining: 20
      });
    } else if (isAuthenticated && amount > 0) {
      checkEligibility();
    }
  }, [isAuthenticated, amount, checkEligibility, simpleMode]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handlePayment = async () => {
    if (!eligibility?.eligible) {
      toast.error('Payment not eligible. Please check your authorization status.');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Please connect your wallet to make payments.');
      return;
    }

    setProcessingPayment(true);
    
    try {
      console.log('🚀 Starting payment process...', simpleMode ? '(Simple Mode)' : '(Full Mode)');

      if (simpleMode) {
        // Simple mode: Direct CDP spend permission execution
        console.log('📱 Simple mode: Using direct CDP spend permissions');

        // Check USDC balance first
        const usdcBalance = await checkUSDCBalance();
        if (usdcBalance < amount) {
          toast.error(`Insufficient USDC balance. You have $${usdcBalance.toFixed(2)} but need $${amount.toFixed(2)}.`);
          return;
        }

        // Check if we have a valid spend permission
        let permissionStatus;
        try {
          permissionStatus = await checkPermissionStatus?.();
        } catch (error) {
          console.error('Error checking permission status:', error);
          permissionStatus = null;
        }

        // Check if SpendPermissionManager is approved (critical for transaction preview)
        if (permissionStatus?.isManagerApproved === false) {
          toast.error(
            'Wallet Setup Required: SpendPermissionManager must be added as wallet owner. ' +
            'Please check console for setup instructions or create a new Coinbase Smart Wallet.',
            { duration: 10000 }
          );
          console.error('❌ SpendPermissionManager not approved - this causes "Transaction preview unavailable" errors');
          console.log('📝 WALLET SETUP REQUIRED:');
          console.log('   1. SpendPermissionManager address: 0xf85210B21cC50302F477BA56686d2019dC9b67Ad');
          console.log('   2. This must be added as a wallet owner in your Coinbase Smart Wallet');
          console.log('   3. Or create a new Coinbase Smart Wallet with spend permissions pre-enabled');
          console.log('🔗 Reference: https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions');
          return;
        }
        
        if (permissionStatus?.isValid && permissionStatus.remaining >= amount) {
          console.log('✅ Valid CDP spend permission found, executing direct payment...');
          
          // Use the existing spend permission (don't create a new one)
          // In simple mode, we trust the existing authorization
          console.log('🔄 Using existing spend permission for payment...');
          
          // Execute payment using existing CDP authorization
          const cdpResult = await payWithROZORewards(null, amount, (result) => {
            console.log('💰 CDP payment successful:', result);
          });

          if (cdpResult) {
            // Convert CDP result format to match expected format
            const paymentResult = {
              transaction_id: cdpResult.txHash,
              amount_paid_usd: amount,
              payment_method: 'cdp_spend_permission',
              cashback_earned: Math.floor(amount * cashbackRate / 100 * 10), // 10x multiplier for demo
              new_rozo_balance: 0, // Would be fetched in real app
              merchant_wallet: merchantWallet,
              status: 'completed'
            };

            onPaymentSuccess?.(paymentResult);
            toast.success(`🎉 Payment successful! Earned ${paymentResult.cashback_earned} ROZO!`);
            return;
          }
        } else {
          console.log('⚠️ No valid CDP spend permission, user needs to authorize first');
          if (permissionStatus) {
            toast.error(`Insufficient authorization. Remaining: $${permissionStatus.remaining?.toFixed(2) || 0}, needed: $${amount.toFixed(2)}`);
          } else {
            toast.error('Please authorize spend permissions first in your profile');
          }
          return;
        }
      }

      // Full mode: Check USDC balance first
      const usdcBalance = await checkUSDCBalance();
      if (usdcBalance < amount) {
        toast.error(`Insufficient USDC balance. You have $${usdcBalance.toFixed(2)} but need $${amount.toFixed(2)}.`);
        return;
      }

      // Try to execute real CDP payment first
      let paymentResult = null;
      let useBackendAPI = false;

      try {
        // Check if we have a valid spend permission
        const permissionStatus = await checkPermissionStatus?.();
        
        if (permissionStatus?.isValid && permissionStatus.remaining >= amount) {
          console.log('✅ Valid CDP spend permission found, attempting direct payment...');
          
          // Create a spend permission structure for the payment
          const spendPermission = await cdpClient.createSpendPermission(address, 100, 24); // $100 daily limit
          
          // Execute payment using CDP spend permission
          const cdpResult = await payWithROZORewards(spendPermission, amount, (result) => {
            console.log('💰 CDP payment successful:', result);
          });

          if (cdpResult) {
            // Convert CDP result format to match expected format
            paymentResult = {
              transaction_id: cdpResult.txHash,
              payment_method: "direct_usdc_cdp",
              amount_paid_usd: amount,
              cashback_earned: cdpResult.rozoEarned,
              tx_hash: cdpResult.txHash,
            };
            
            toast.success(
              `✅ CDP Payment successful! Paid $${amount.toFixed(2)} to ${merchantName}. ` +
              `Earned ${cdpResult.rozoEarned.toFixed(1)} ROZO!`
            );
          }
        } else {
          console.log('⚠️ No valid CDP spend permission, falling back to backend API...');
          useBackendAPI = true;
        }
      } catch (cdpPaymentError) {
        console.log('⚠️ CDP payment failed, falling back to backend API...', cdpPaymentError);
        useBackendAPI = true;
      }

      // Fallback to backend API (which now has real blockchain integration)
      if (useBackendAPI || !paymentResult) {
        console.log('🔄 Using backend API for payment processing...');
        paymentResult = await processPayment(
          merchantWallet,
          amount,
          cashbackRate,
          false // Using USDC, not ROZO credit
        );

        if (paymentResult) {
          toast.success(
            `✅ Payment successful! Paid $${amount.toFixed(2)} to ${merchantName}. ` +
            `Earned ${paymentResult.cashback_earned.toFixed(1)} ROZO!`
          );
        }
      }

      if (paymentResult) {
        onPaymentSuccess?.(paymentResult);
        
        // Refresh eligibility for next payment
        await checkEligibility();
      }
      
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      if (error.message.includes('insufficient')) {
        toast.error(error.message);
      } else if (error.name === 'UserRejectedRequestError') {
        toast.error('Payment cancelled by user.');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatRozo = (value: number) => `${value} ROZO`;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Payment Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pay at {merchantName}</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(amount)}
            </span>
          </CardTitle>
          <CardDescription>
            Earn {cashbackRate}% cashback in ROZO tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cashback Preview */}
          {eligibility?.cashback_preview && (
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">You&apos;ll earn</p>
                  <p className="text-lg font-semibold text-green-800">
                    {formatRozo(eligibility.cashback_preview.estimated_rozo)}
                  </p>
                  <p className="text-xs text-green-600">
                    ≈ {formatCurrency(eligibility.cashback_preview.estimated_usd)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">Effective Rate</p>
                  <p className="text-lg font-semibold text-green-800">
                    {eligibility.cashback_preview.final_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Authorization Status */}
          {eligibility?.spend_permission && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Remaining authorization:</span>
              <span className="font-medium">
                {formatCurrency(eligibility.spend_permission.remaining_today)}
              </span>
            </div>
          )}

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={
              disabled || 
              loading || 
              processingPayment || 
              !eligibility?.eligible ||
              amount <= 0
            }
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {processingPayment ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing Payment...</span>
              </div>
            ) : loading ? (
              'Checking Eligibility...'
            ) : !eligibility ? (
              'Check Eligibility'
            ) : !eligibility.eligible ? (
              'Payment Not Available'
            ) : (
              <>
                💳 Pay {formatCurrency(amount)} - One Tap
              </>
            )}
          </Button>

          {/* Eligibility Status */}
          {eligibility && !eligibility.eligible && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Payment not available
              </p>
              {eligibility.recommendations && eligibility.recommendations.length > 0 && (
                <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                  {eligibility.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* One-tap explanation */}
          {eligibility?.eligible && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✨ <strong>One-Tap Payment:</strong> No wallet signature required for this payment.
                Cashback will be automatically credited to your account.
              </p>
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
                <p className="font-medium text-red-800">Payment Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merchant Info */}
      <div className="text-xs text-gray-500 text-center">
        <p>Payment to: {merchantName}</p>
        <p className="font-mono">{merchantWallet}</p>
      </div>
    </div>
  );
};
