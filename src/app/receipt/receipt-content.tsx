"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDisplayCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeftIcon, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type PaymentData = {
  from_address: string;
  to_handle: string;
  amount_usd_cents: number;
  amount_local: number;
  currency_local: string;
  timestamp: number;
  order_id: string;
  about: string;
  signature: string;
  service_name?: string;
  service_domain?: string;
  restaurant_name?: string;
  restaurant_address?: string;
};

export default function ReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Small delay to ensure sessionStorage is available (helps with SSR/hydration)
    const checkPaymentData = () => {
      if (hasChecked) return; // Prevent multiple checks

      // First try sessionStorage
      const storedData = sessionStorage.getItem("payment_receipt");

      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setPaymentData(data);
          setIsLoading(false);
          setHasChecked(true);
          return;
        } catch (error) {
          console.error(
            "Error parsing payment data from sessionStorage:",
            error
          );
        }
      }

      // Fallback: Try URL parameters
      const dataParam = searchParams.get("data");
      if (dataParam) {
        try {
          const data = JSON.parse(decodeURIComponent(dataParam));
          setPaymentData(data);
          setIsLoading(false);
          setHasChecked(true);
          return;
        } catch (error) {
          console.error("Error parsing payment data from URL params:", error);
        }
      }

      // No data found from either source
      setIsLoading(false);
      setHasChecked(true);
      // Only redirect after we've actually checked - give more time for data to load
      setTimeout(() => {
        router.push("/");
      }, 2000);
    };

    // Check immediately and also after a small delay
    checkPaymentData();
    const timeoutId = setTimeout(checkPaymentData, 300);

    return () => clearTimeout(timeoutId);
  }, [router, hasChecked, searchParams]);

  // Note: We don't clear sessionStorage to ensure data persists

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MM dd yyyy HH:mm");
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  if (isLoading || !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {isLoading ? "Loading payment details..." : "Payment data not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b">
        <h1 className="text-lg font-semibold">Payment Complete</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You have successfully paid{" "}
            <span className="font-semibold">
              {getDisplayCurrency(paymentData.currency_local)}{" "}
              {paymentData.amount_local.toFixed(2)}
            </span>{" "}
            to{" "}
            <span className="font-semibold">
              {paymentData.service_name ||
                paymentData.restaurant_name ||
                paymentData.to_handle}
            </span>
          </p>
        </div>

        {/* Payment Details Card */}
        <Card className="w-full max-w-sm bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 py-0">
          <CardContent className="p-6 space-y-4">
            {getDisplayCurrency(paymentData.currency_local) !== "USD" && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Amount ({getDisplayCurrency(paymentData.currency_local)}):
                </span>
                <span className="font-semibold">
                  {getDisplayCurrency(paymentData.currency_local)}{" "}
                  {paymentData.amount_local.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">USD Equivalent:</span>
              <span className="font-semibold">
                $ {(paymentData.amount_usd_cents / 100).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Points Used:</span>
              <span className="font-semibold">
                {paymentData.amount_usd_cents} pts
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Merchant:</span>
              <span className="font-semibold">
                {paymentData.service_name ||
                  paymentData.restaurant_name ||
                  paymentData.to_handle}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold">
                {formatDate(paymentData.timestamp)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-semibold text-xs">
                {paymentData.order_id}
              </span>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={handleBackToHome}
          className="w-full max-w-sm"
          size="lg"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
