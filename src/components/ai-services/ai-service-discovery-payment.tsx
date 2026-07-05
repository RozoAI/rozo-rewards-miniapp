"use client";

import { Button } from "@/components/ui/button";
import { getAiServiceById } from "@/lib/ai-services";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { savePaymentReceipt, type PaymentData } from "@/lib/payment-storage";
import { DATA_SUFFIX } from "@/providers/Web3Provider";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import { CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

const toAddress = "0x2352Fa2970dBadD12d21808DB0F56CDEC8141739";

interface AiServiceDiscoveryPaymentProps {
  service: NonNullable<ReturnType<typeof getAiServiceById>>;
  merchantOrderId: string;
  userEmail: string;
  appId: string;
  validateEmailInput: () => boolean;
  paymentLoading: boolean;
  setPaymentLoading: (value: boolean) => void;
}

export function AiServiceDiscoveryPayment({
  service,
  merchantOrderId,
  userEmail,
  appId,
  validateEmailInput,
  paymentLoading,
  setPaymentLoading,
}: AiServiceDiscoveryPaymentProps) {
  const router = useRouter();
  const { resetPayment } = useRozoPayUI();
  const { address } = useAccount();

  const priceUsd = service?.price_usd ?? 0;
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const metadata = React.useMemo(() => {
    const baseMetadata = {
      amount_local: service?.price_usd,
      currency_local: "USD",
      email: userEmail,
      dataSuffix: DATA_SUFFIX,
      items: [
        {
          name: service?.name,
          description: `${service?.price_usd ?? "N/A"} USD`,
        },
      ],
    };

    if (service?.id) {
      return {
        ...baseMetadata,
        merchant_order_id: merchantOrderId,
        ...(service?.sold_out ? { receiptUrl: receiptUrl } : {}),
        items: [
          ...baseMetadata.items,
          {
            name: "Order ID",
            description: merchantOrderId,
          },
        ],
      };
    }

    return baseMetadata;
  }, [
    service?.price_usd,
    service?.name,
    service?.id,
    service?.sold_out,
    userEmail,
    merchantOrderId,
    receiptUrl,
  ]);

  // Initial reset payment on mount (discovery-only)
  useEffect(() => {
    if (!service) return;

    resetPayment({
      appId: appId,
      intent: `Pay for ${service.name}`,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token as `0x${string}`,
      ...(typeof service.price_usd === "number" && {
        toUnits: service.price_usd.toString(),
      }),
      metadata: metadata as any,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id]);

  // Update payment metadata when email changes (but only after initial load)
  useEffect(() => {
    if (!userEmail || !service) return;

    resetPayment({
      appId: appId,
      intent: `Pay for ${service.name}`,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token as `0x${string}`,
      ...(typeof service.price_usd === "number" && {
        toUnits: service.price_usd.toString(),
      }),
      metadata: metadata as any,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const handlePaymentCompleted = (_args: PaymentCompletedEvent) => {
    if (!service) return;

    toast.success(`Payment successful to ${service.name}!`, {
      description:
        "Your payment has been processed successfully. Redirecting to receipt...",
      duration: 2000,
    });

    capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
      merchant_id: service.id,
      merchant_name: service.name,
      payment_method: "crypto",
      amount_usd: priceUsd.toString(),
      order_id: merchantOrderId,
    });

    // Store payment data in localStorage for receipt page
    const receiptData: PaymentData = {
      from_address: address || "",
      to_handle: service.id,
      amount_usd_cents: priceUsd * 100,
      amount_local: priceUsd,
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: merchantOrderId,
      about: `Pay for ${service.name}`,
      service_name: service.name,
      service_domain: service.id,
      is_using_points: false,
    };

    console.log("[AI Services] Pay with Crypto - About to save receipt:", {
      merchantOrderId,
      receiptData,
    });
    savePaymentReceipt(merchantOrderId, receiptData);
    console.log(
      "[AI Services] Pay with Crypto - Receipt saved, navigating to /receipt?payment_id=" +
        merchantOrderId,
    );

    // Prefetch and navigate to receipt page
    router.prefetch("/receipt");
    setTimeout(() => {
      router.push(`/receipt?payment_id=${merchantOrderId}`);
    }, 1000);
  };

  if (!service) return null;

  return (
    <>
      {/* Intent SDK for non mini app */}
      <RozoPayButton.Custom
        resetOnSuccess
        appId={appId}
        intent={`Pay for ${service.name}`}
        toAddress={toAddress}
        toChain={baseUSDC.chainId}
        toToken={baseUSDC.token}
        {...(service.price_usd && {
          toUnits: service.price_usd.toString(),
        })}
        metadata={metadata as any}
        onPaymentStarted={() => {
          setPaymentLoading(true);
          capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
            merchant_id: service.id,
            merchant_name: service.name,
            payment_method: "crypto",
            amount_usd: priceUsd.toString(),
            order_id: merchantOrderId,
          });
        }}
        onPaymentCompleted={handlePaymentCompleted}
      >
        {({ show }) => (
          <div className="m-auto flex w-full flex-col gap-2">
            <Button
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
              size={"lg"}
              onClick={() => {
                if (!validateEmailInput()) {
                  return;
                }
                capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
                  merchant_id: service.id,
                  merchant_name: service.name,
                  payment_method: "crypto",
                });
                show();
              }}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <>
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Pay with Crypto
                </>
              )}
            </Button>
          </div>
        )}
      </RozoPayButton.Custom>
    </>
  );
}
