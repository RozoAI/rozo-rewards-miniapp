'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRozoAPI } from '@/hooks/useRozoAPI';
import { useCDPPermissions } from '@/hooks/useCDPPermissions';
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
  className = ""
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

  // Check payment eligibility when authenticated and amount changes
  useEffect(() => {
    if (isAuthenticated && amount > 0) {
      checkEligibility();
    }
  }, [isAuthenticated, amount, checkEligibility]);

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
      console.log('🚀 Starting payment process...');

      // Check USDC balance first
      const usdcBalance = await checkUSDCBalance();
      if (usdcBalance < amount) {
        toast.error(`Insufficient USDC balance. You have $${usdcBalance.toFixed(2)} but need $${amount.toFixed(2)}.`);
        return;
      }

      // Use current mock payment system (will be upgraded to real CDP later)
      const result = await processPayment(
        merchantWallet,
        amount,
        cashbackRate,
        false // Using USDC, not ROZO credit
      );

      if (result) {
        toast.success(
          `✅ Payment successful! Paid $${amount.toFixed(2)} to ${merchantName}. ` +
          `Earned ${result.cashback_earned.toFixed(1)} ROZO!`
        );
        
        onPaymentSuccess?.(result);
        
        // Refresh eligibility for next payment
        await checkEligibility();
      }
      
      // TODO: Implement real CDP payment execution
      // When spend permission storage is available:
      // const paymentResult = await payWithROZORewards(spendPermission, amount);
      
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
