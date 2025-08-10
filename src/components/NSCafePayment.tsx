'use client';

import React, { useState } from 'react';
import { PaymentButton } from './PaymentButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Badge component not available, using span instead
import { TEST_CONFIG } from '@/hooks/useRozoAPI';

interface NSCafePaymentProps {
  onPaymentSuccess?: (data: any) => void;
  className?: string;
  availableCredit?: number; // Show available credit amount
}

export const NSCafePayment: React.FC<NSCafePaymentProps> = ({
  onPaymentSuccess,
  className = "",
  availableCredit = 20
}) => {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  const handlePaymentSuccess = (paymentData: any) => {
    // Add to payment history
    const newPayment = {
      id: paymentData.transaction_id,
      timestamp: new Date().toISOString(),
      amount: paymentData.amount_paid_usd,
      rozo_earned: paymentData.cashback_earned,
      new_balance: paymentData.new_rozo_balance
    };
    
    setPaymentHistory(prev => [newPayment, ...prev.slice(0, 4)]); // Keep last 5 payments
    
    // Notify parent component
    onPaymentSuccess?.(paymentData);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* NS Cafe Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>☕ NS Cafe</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                  {TEST_CONFIG.cashbackRate}% Cashback
                </span>
              </CardTitle>
              <CardDescription>
                Premium coffee and workspace in downtown
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                ${TEST_CONFIG.nsCafePayment.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">per coffee</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Expected ROZO</p>
              <p className="text-lg font-semibold text-gray-800">
                {TEST_CONFIG.expectedRozo} ROZO
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Cashback Value</p>
              <p className="text-lg font-semibold text-gray-800">
                ${(TEST_CONFIG.nsCafePayment * TEST_CONFIG.cashbackRate / 100).toFixed(3)}
              </p>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            {[
              "• High-quality organic coffee",
              "• Fast WiFi and comfortable seating", 
              "• Open 7AM - 10PM daily"
            ].map((feature, index) => (
              <p key={`feature-${index}`}>{feature}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Credit Display */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4 pb-4">
          <div className="text-center">
            <p className="text-sm text-green-600">💳 Available Credit</p>
            <p className="text-2xl font-bold text-green-800">${availableCredit.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <PaymentButton
        merchant="ns-cafe"
        merchantName="NS Cafe"
        merchantWallet={TEST_CONFIG.nsCafeWallet}
        amount={TEST_CONFIG.nsCafePayment}
        cashbackRate={TEST_CONFIG.cashbackRate}
        onPaymentSuccess={handlePaymentSuccess}
        simpleMode={true}
      />


      {/* Recent Payments */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent NS Cafe Payments</CardTitle>
            <CardDescription>Your latest coffee purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistory.map((payment, index) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-green-800">
                      ☕ Coffee Purchase
                    </p>
                    <p className="text-sm text-green-600">
                      {new Date(payment.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-800">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-green-600">
                      +{payment.rozo_earned} ROZO
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-blue-800">
              💡 How it works
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              {[
                "1. Make sure you have authorized spending in your profile",
                "2. Click \"Pay\" for instant one-tap payment", 
                "3. Earn ROZO cashback automatically",
                "4. Use ROZO for future payments or keep earning"
              ].map((step, index) => (
                <p key={`step-${index}`}>{step}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
