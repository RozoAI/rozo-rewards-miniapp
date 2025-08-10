'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Badge component not available, using span instead
import { useRozoAPI, TEST_CONFIG } from '@/hooks/useRozoAPI';
import { useCredit } from '@/contexts/CreditContext';
import { CreditPaymentButton } from '@/components/CreditPaymentButton';
import { toast } from 'sonner';

interface RozoPaymentIntegrationProps {
  restaurantId: string;
  restaurantName: string;
  amount?: number;
  cashbackRate?: number;
  onPaymentSuccess?: (data: any) => void;
}

export const RozoPaymentIntegration: React.FC<RozoPaymentIntegrationProps> = ({
  restaurantId,
  restaurantName,
  amount = TEST_CONFIG.nsCafePayment,
  cashbackRate = TEST_CONFIG.cashbackRate,
  onPaymentSuccess
}) => {
  const { 
    loading, 
    isAuthenticated,
    checkPaymentEligibility, 
    processPayment,
    authenticateWallet
  } = useRozoAPI();
  
  const { availableCredit } = useCredit();

  const [paymentEligible, setPaymentEligible] = useState<boolean | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Check if one-tap payment is available
  const checkEligibility = async () => {
    if (!isAuthenticated) {
      await authenticateWallet();
      return;
    }

    try {
      const eligibility = await checkPaymentEligibility(amount, false);
      if (eligibility) {
        setPaymentEligible(eligibility.eligible);
        
        if (!eligibility.eligible) {
          toast.error('One-tap payment not available. Please set up authorization in your profile.');
        } else {
          toast.success('✅ One-tap payment available!');
        }
      }
    } catch (error: any) {
      console.error('Eligibility check error:', error);
      if (error.message?.includes('Demo mode')) {
        setPaymentEligible(false);
        toast.info('🎯 Demo mode: Set up authorization first to enable payments');
      } else {
        toast.error('Unable to check payment eligibility. Please try again.');
      }
    }
  };

  // Process the one-tap payment
  const handleOneTapPayment = async () => {
    if (!isAuthenticated) {
      toast.error('Please authenticate first');
      return;
    }

    setProcessingPayment(true);
    
    try {
      const result = await processPayment(
        TEST_CONFIG.nsCafeWallet, // Use sample merchant wallet
        amount,
        cashbackRate,
        false
      );

      if (result) {
        toast.success(
          `🎉 Payment successful at ${restaurantName}!`,
          {
            description: `Earned ${result.cashback_earned} ROZO tokens`,
            duration: 5000,
          }
        );
        
        onPaymentSuccess?.(result);
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  // If not authenticated, show authentication prompt
  if (!isAuthenticated) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">🔐 Rozo Rewards Integration</CardTitle>
          <CardDescription>
            Earn ROZO cashback on your purchase at {restaurantName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
              <div>
                <p className="font-medium text-blue-800">Potential Cashback</p>
                <p className="text-sm text-blue-600">
                  {cashbackRate}% = {Math.round(amount * cashbackRate)} ROZO
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                ${(amount * cashbackRate / 100).toFixed(3)} value
              </span>
            </div>
            
            <Button 
              onClick={authenticateWallet}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Authenticate for Cashback'}
            </Button>
            
            <p className="text-xs text-blue-600 text-center">
              Sign with your wallet to enable ROZO cashback rewards
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-800">💰 Rozo Rewards Available</CardTitle>
        <CardDescription>
          Earn {cashbackRate}% cashback in ROZO tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Cashback Preview */}
          <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg">
            <div>
              <p className="font-medium text-green-800">You&apos;ll earn</p>
              <p className="text-lg font-bold text-green-800">
                {Math.round(amount * cashbackRate)} ROZO
              </p>
              <p className="text-sm text-green-600">
                ≈ ${(amount * cashbackRate / 100).toFixed(3)} USD
              </p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
              {cashbackRate}% Cashback
            </span>
          </div>

          {/* Payment Methods */}
          <Tabs defaultValue={availableCredit > 0 ? "credit" : "crypto"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credit" disabled={availableCredit === 0}>
                💳 Credit {availableCredit > 0 ? `($${availableCredit.toFixed(2)})` : '(None)'}
              </TabsTrigger>
              <TabsTrigger value="crypto">🪙 Crypto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="credit" className="space-y-3">
              {availableCredit > 0 ? (
                <CreditPaymentButton
                  merchantName={restaurantName}
                  merchantAddress={TEST_CONFIG.nsCafeWallet}
                  amount={amount}
                  cashbackRate={cashbackRate}
                  onPaymentSuccess={onPaymentSuccess}
                />
              ) : (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-yellow-800 font-medium mb-2">
                      💳 No Credit Available
                    </p>
                    <p className="text-xs text-yellow-700 mb-3">
                      Set up payment authorization in your profile to use credit payments
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/profile'}
                      size="sm"
                      variant="outline"
                    >
                      Go to Profile
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="crypto" className="space-y-3">
              {paymentEligible === null && (
                <Button 
                  onClick={checkEligibility}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  Check One-Tap Payment Availability
                </Button>
              )}

              {paymentEligible === true && (
                <Button 
                  onClick={handleOneTapPayment}
                  disabled={processingPayment}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {processingPayment ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Payment...</span>
                    </div>
                  ) : (
                    `💳 One-Tap Pay $${amount.toFixed(2)}`
                  )}
                </Button>
              )}

              {paymentEligible === false && (
                <div className="text-center">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    ⚠️ One-tap payment not available
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    Set up payment authorization in your profile first
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/profile'}
                    size="sm"
                    variant="outline"
                  >
                    Go to Profile
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="text-xs text-green-700 text-center">
            <p>🎯 Demo Integration: Cashback automatically credited to your account</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
