'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Loader2, Wallet, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCredit } from '@/contexts/CreditContext';
import { useRozoAPI } from '@/hooks/useRozoAPI';

interface CreditPaymentButtonProps {
  merchantName: string;
  merchantAddress: string;
  amount: number;
  cashbackRate?: number;
  onPaymentSuccess?: (data: any) => void;
  className?: string;
  disabled?: boolean;
}

export const CreditPaymentButton: React.FC<CreditPaymentButtonProps> = ({
  merchantName,
  merchantAddress,
  amount,
  cashbackRate = 10,
  onPaymentSuccess,
  className = "",
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { availableCredit, deductCredit, refreshCredit } = useCredit();
  const { processPayment } = useRozoAPI();

  const canAffordPayment = availableCredit >= amount;
  const estimatedCashback = (amount * cashbackRate) / 100;

  const handleCreditPayment = async () => {
    if (!canAffordPayment) {
      toast.error('Insufficient credit balance', {
        description: `You need $${amount.toFixed(2)} but only have $${availableCredit.toFixed(2)} available.`
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Process payment using credit
      const paymentResult = await processPayment(
        merchantAddress,
        amount,
        cashbackRate,
        true // isUsingCredit = true
      );

      if (paymentResult) {
        setPaymentSuccess(true);
        
        // Refresh credit from backend (this will get the updated allowance)
        await refreshCredit();
        
        toast.success(`🎉 Payment successful at ${merchantName}!`, {
          description: `Paid $${amount.toFixed(2)} • Earned ${estimatedCashback.toFixed(0)} ROZO`,
          duration: 5000,
        });

        // Notify parent component
        onPaymentSuccess?.({
          ...paymentResult,
          merchant: merchantName,
          amount_paid_usd: amount,
          cashback_earned: estimatedCashback,
          payment_method: 'credit'
        });

        // Reset success state after delay
        setTimeout(() => setPaymentSuccess(false), 3000);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      console.error('Credit payment error:', error);
      toast.error('Payment failed', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Credit Balance Display */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">💳 Available Credit</p>
              <p className="text-2xl font-bold text-blue-900">${availableCredit.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Payment Amount</p>
              <p className="text-xl font-semibold text-blue-800">${amount.toFixed(2)}</p>
            </div>
          </div>
          
          {estimatedCashback > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                💰 Estimated ROZO Cashback: <span className="font-semibold">{estimatedCashback.toFixed(0)} ROZO</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button
        onClick={handleCreditPayment}
        disabled={disabled || isProcessing || !canAffordPayment || paymentSuccess}
        className={`w-full h-12 text-base font-semibold ${
          paymentSuccess 
            ? 'bg-green-600 hover:bg-green-600' 
            : canAffordPayment 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-400 hover:bg-gray-400'
        }`}
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Payment...
          </>
        ) : paymentSuccess ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Payment Complete!
          </>
        ) : canAffordPayment ? (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pay ${amount.toFixed(2)} with Credit
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-5 w-5" />
            Insufficient Credit
          </>
        )}
      </Button>

      {!canAffordPayment && (
        <p className="text-sm text-center text-red-600">
          Need ${(amount - availableCredit).toFixed(2)} more credit to complete this payment
        </p>
      )}
    </div>
  );
};
