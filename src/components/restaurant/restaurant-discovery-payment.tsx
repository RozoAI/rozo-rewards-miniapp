"use client";

import { Button } from "@/components/ui/button";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { createMerchantPayment } from "@/lib/api";
import { savePaymentReceipt, type PaymentData } from "@/lib/payment-storage";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { DATA_SUFFIX } from "@/providers/Web3Provider";
import { Restaurant } from "@/types/restaurant";
import { PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton } from "@rozoai/intent-pay";
import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface RestaurantDiscoveryPaymentProps {
  restaurant: Restaurant;
  paymentAmount: string;
  appId: string;
  merchantOrderId: string;
  toAddress: string;
  generateMetadata: (amountLocal: string, currencyLocal: string) => object;
  loading: boolean;
  setLoading: (value: boolean) => void;
  prefilledPayment?: {
    id: string;
    source: { amount?: string };
    metadata?: { amount_local?: string } | null;
  } | null;
}

export function RestaurantDiscoveryPayment({
  restaurant,
  paymentAmount,
  appId,
  merchantOrderId,
  toAddress,
  generateMetadata,
  loading,
  setLoading,
  prefilledPayment,
}: RestaurantDiscoveryPaymentProps) {
  const router = useRouter();

  const prefilledAmount = prefilledPayment
    ? String(
        parseFloat(
          prefilledPayment.metadata?.amount_local ??
            prefilledPayment.source?.amount ??
            "0",
        ),
      )
    : null;
  const [paymentId, setPaymentId] = React.useState<string | null>(
    prefilledPayment?.id ?? null,
  );
  const [confirmedAmount, setConfirmedAmount] = useState<string | null>(
    prefilledAmount,
  );
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const showRef = useRef<(() => void) | null>(null);

  // Reset payment only when amount changes from the original prefilled value
  useEffect(() => {
    if (prefilledAmount && paymentAmount === prefilledAmount) return;
    setPaymentId(null);
    setConfirmedAmount(null);
    setIsPreparingPayment(false);
    showRef.current = null;
  }, [paymentAmount, prefilledAmount]);

  // Auto-open modal once paymentId is set and show function available
  useEffect(() => {
    if (paymentId && showRef.current) {
      setIsPreparingPayment(true);
      const timer = setTimeout(() => {
        showRef.current?.();
        setIsPreparingPayment(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [paymentId]);

  const handleCreatePayment = useCallback(async () => {
    if (!restaurant || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsCreatingPayment(true);
    capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
      merchant_id: restaurant._id,
      merchant_name: restaurant.name,
      payment_method: "crypto",
    });

    try {
      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const response = await createMerchantPayment({
        appId: restaurant.app_id ?? `pos_${restaurant.handle}`,
        amount_local: paymentAmount,
        currency_local: displayCurrency,
        source: { chainId: "8453", tokenSymbol: "USDC" },
        metadata: {
          dataSuffix: DATA_SUFFIX,
          customDeeplinkUrl: `${window.location.origin}${window.location.pathname}?paymentId=`,
        },
      });
      setPaymentId(response.id);
      setConfirmedAmount(
        response.source.amount
          ? String(parseFloat(response.source.amount))
          : null,
      );
    } catch (error) {
      console.error("[Restaurant] Failed to create payment:", error);
      toast.error("Failed to create payment. Please try again.");
    } finally {
      setIsCreatingPayment(false);
    }
  }, [restaurant, paymentAmount]);

  const handlePaymentCompleted = useCallback(
    (args?: PaymentCompletedEvent) => {
      console.log("[Restaurant] Payment completed:", args);

      if (!restaurant) return;

      toast.success(`Payment successful to ${restaurant.name}!`, {
        description:
          "Your payment has been processed successfully. Redirecting to receipt...",
        duration: 2000,
      });

      const displayCurrency = getDisplayCurrency(restaurant?.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "crypto",
        amount_usd: usdAmount,
        order_id: merchantOrderId,
      });

      const receiptData: PaymentData = {
        // from_address: address || "",
        from_address: "",
        to_handle:
          restaurant.handle ||
          restaurant.name.toLowerCase().replace(/\s+/g, ""),
        amount_usd_cents: parseFloat(usdAmount) * 100,
        amount_local: parseFloat(paymentAmount),
        currency_local: displayCurrency,
        timestamp: Date.now(),
        order_id: merchantOrderId,
        about: `Pay for ${restaurant.name} - ${displayCurrency} ${paymentAmount}`,
        restaurant_name: restaurant.name,
        restaurant_address: restaurant.address_line1,
        is_using_points: false,
        payment_id: paymentId ?? undefined,
      };

      console.log("[Restaurant] Pay with Crypto - About to save receipt:", {
        merchantOrderId,
        receiptData,
      });
      savePaymentReceipt(merchantOrderId, receiptData);
      console.log(
        "[Restaurant] Pay with Crypto - Receipt saved, navigating to /receipt?payment_id=" +
          merchantOrderId,
      );

      setTimeout(() => {
        setLoading(false);
        router.push(`/receipt?payment_id=${merchantOrderId}`);
      }, 1000);
    },
    [restaurant, paymentAmount, merchantOrderId],
  );

  if (!restaurant) return null;

  const displayCurrency = getDisplayCurrency(restaurant?.currency);
  const usdAmount = convertToUSD(paymentAmount, displayCurrency);
  const isAmountValid =
    paymentAmount &&
    parseFloat(paymentAmount) > 0 &&
    !isNaN(parseFloat(paymentAmount));

  return (
    <>
      {paymentId ? (
        <RozoPayButton.Custom
          key={paymentId}
          resetOnSuccess
          payId={paymentId}
          onPaymentStarted={() => {
            setLoading(true);
            capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
              merchant_id: restaurant._id,
              merchant_name: restaurant.name,
              payment_method: "crypto",
              amount_usd: usdAmount,
              order_id: merchantOrderId,
            });
          }}
          onPaymentCompleted={handlePaymentCompleted}
        >
          {({ show }) => {
            showRef.current = show;
            return (
              <Button
                variant="default"
                className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                onClick={show}
                disabled={loading || isPreparingPayment}
                size="lg"
              >
                {loading || isPreparingPayment ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isPreparingPayment
                  ? "Preparing Payment..."
                  : `Pay $${confirmedAmount ?? (isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount)} with Crypto`}
              </Button>
            );
          }}
        </RozoPayButton.Custom>
      ) : (
        <Button
          variant="default"
          className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
          onClick={handleCreatePayment}
          disabled={isCreatingPayment || loading || !isAmountValid}
          size="lg"
        >
          {isCreatingPayment ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          )}
          {isCreatingPayment
            ? "Creating Payment..."
            : `Pay $${isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount} with Crypto`}
        </Button>
      )}
    </>
  );
}
