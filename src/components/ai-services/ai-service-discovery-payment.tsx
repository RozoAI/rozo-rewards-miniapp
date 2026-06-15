"use client";

import { PaymentData } from "@/app/(main)/receipt/receipt-content";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { getAiServiceById } from "@/lib/ai-services";
import { savePaymentReceipt } from "@/lib/payment-storage";
import { useAppKitAccount } from "@reown/appkit/react";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import { Coins, CreditCard, HelpCircle, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "sonner";

const toAddress = "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";

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
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAppKitAccount();

  const [points, setPoints] = React.useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);

  const priceUsd = service?.price_usd ?? 0;
  const hasPrice = typeof service?.price_usd === "number";
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const metadata = React.useMemo(() => {
    const baseMetadata = {
      amount_local: service?.price_usd,
      currency_local: "USD",
      email: userEmail,
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

  // Fetch points balance
  useEffect(() => {
    const fetchPoints = async () => {
      if (!address || !isConnected) return;

      const pts = await getPoints(address);
      setPoints(pts / 100);
    };
    fetchPoints();
  }, [isConnected, address, getPoints]);

  const handlePaymentCompleted = (_args: PaymentCompletedEvent) => {
    if (!service) return;

    toast.success(`Payment successful to ${service.name}!`, {
      description:
        "Your payment has been processed successfully. Redirecting to receipt...",
      duration: 2000,
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

  const handlePayWithPoints = () => {
    if (!validateEmailInput()) {
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmPaymentWithPoints = async () => {
    if (!address || !service) return;

    setDialogLoading(true);

    const paymentData = {
      from_address: address,
      to_handle: service.id,
      amount_usd_cents: priceUsd * 100,
      amount_local: priceUsd,
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: merchantOrderId,
      about: `Pay for ${service.name}`,
    };

    const response = await spendPoints(paymentData);

    if (response && response.status === "success") {
      // Store payment data in localStorage for receipt page
      const receiptData = {
        ...response.data,
        service_name: service.name,
        service_domain: service.id,
        is_using_points: true,
      };

      console.log("[AI Services] Pay with Points - About to save receipt:", {
        merchantOrderId,
        receiptData,
      });
      savePaymentReceipt(merchantOrderId, receiptData);
      console.log(
        "[AI Services] Pay with Points - Receipt saved, navigating to /receipt?payment_id=" +
          merchantOrderId,
      );

      setShowConfirmDialog(false);

      // Navigate to receipt page
      router.push(`/receipt?payment_id=${merchantOrderId}`);
    } else {
      toast.error("Failed to spend points");
      setDialogLoading(false);
    }
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

      {/* Pay with Points Button */}
      {points > 0 && (
        <div className="space-y-2">
          <Button
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
            size={"lg"}
            onClick={handlePayWithPoints}
            variant="outline"
            disabled={!hasPrice || points < priceUsd}
          >
            <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
            Pay with{" "}
            {new Intl.NumberFormat("en-US", {
              style: "decimal",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(priceUsd * 100)}{" "}
            Points
          </Button>
          <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            Available Points: {Number((points ?? 0) * 100).toFixed(2)} pts
            <CustomTooltip
              content="Explore all the benefits of Rozo. Rozo points are the rewards for your purchases."
              position="top"
              className="w-48 sm:w-[20rem] ml-1.5"
            >
              <HelpCircle className="ml-3 size-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
            </CustomTooltip>
          </div>
        </div>
      )}

      {/* Pay with Points Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment with Points</DialogTitle>
            <DialogDescription>
              You are about to pay for{" "}
              <span className="font-medium text-foreground">
                {service?.name}
              </span>{" "}
              using your Rozo Points.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Points to be used:
                </span>
                <span className="font-semibold text-foreground">
                  {service &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(priceUsd * 100)}{" "}
                  pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Available Points:
                </span>
                <span className="font-medium text-muted-foreground">
                  {Number((points ?? 0) * 100).toFixed(2)} pts
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Remaining Points:
                </span>
                <span className="font-semibold text-foreground">
                  {service &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format((points - priceUsd) * 100)}{" "}
                  pts
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={dialogLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPaymentWithPoints}
              disabled={dialogLoading}
              className="w-full sm:w-auto"
            >
              {dialogLoading ? (
                <>
                  <Wallet className="size-4 animate-pulse mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="size-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
