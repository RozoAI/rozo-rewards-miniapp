"use client";

import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { capture } from "@/lib/analytics/index";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import {
  formatRozoErrorMessage,
  isRozoProviderError,
  isUserCancellation,
} from "@/lib/rozo-errors";
import { savePaymentReceipt } from "@/lib/payment-storage";
import { getAiServiceById } from "@/lib/ai-services";
import {
  baseUSDC,
  createPayment,
  rozoStellarUSDC,
} from "@rozoai/intent-common";
import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

const toAddress = "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";

interface AiServiceDappPaymentProps {
  service: NonNullable<ReturnType<typeof getAiServiceById>>;
  merchantOrderId: string;
  userEmail: string;
  appId: string;
  validateEmailInput: () => boolean;
}

export function AiServiceDappPayment({
  service,
  merchantOrderId,
  userEmail,
  appId,
  validateEmailInput,
}: AiServiceDappPaymentProps) {
  const router = useRouter();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
    walletAddress: rozoWalletAddress,
    balance: rozoWalletBalance,
    transferUSDC: rozoWalletTransfer,
  } = useRozoWallet();

  const [isRozoWalletPaymentLoading, setIsRozoWalletPaymentLoading] =
    React.useState(false);

  const priceUsd = service?.price_usd ?? 0;
  const hasPrice = typeof service?.price_usd === "number";
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const generateMetadata = () => {
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
  };

  // Pay with Rozo Wallet (Stellar USDC)
  // Only shown when page is opened in Rozo Wallet mobile app
  // Uses window.rozo provider for gasless USDC transfers
  const generateBridgeAddress = async (
    amount: string,
  ): Promise<{
    amount: string;
    bridgeAddress: string;
    memo: string;
    receiverAddressContract?: string;
    receiverMemoContract?: string;
  }> => {
    const payment = await createPayment({
      appId: appId,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
      toUnits: amount,
      preferredChain: rozoStellarUSDC.chainId,
      preferredTokenAddress: rozoStellarUSDC.token,
      metadata: generateMetadata() as any,
      title: `Pay for ${service?.name}`,
    });

    if (
      !payment.source.receiverAddress ||
      !payment.source.amount ||
      !payment.source.receiverMemo
    ) {
      throw new Error("Failed to generate bridge address");
    }

    return {
      amount: payment.source.amount,
      bridgeAddress: payment.source.receiverAddress,
      memo: payment.source.receiverMemo,
      receiverAddressContract: payment.source.receiverAddressContract,
      receiverMemoContract: payment.source.receiverMemoContract,
    };
  };

  const handlePayWithRozoWallet = async () => {
    if (!service || !validateEmailInput()) return;

    try {
      setIsRozoWalletPaymentLoading(true);

      if (typeof service.price_usd !== "number") {
        toast.error("Price unavailable for this service");
        return;
      }
      const usdAmount = service.price_usd.toString();

      capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
        merchant_id: service.id,
        merchant_name: service.name,
        payment_method: "rozo_wallet",
      });
      capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
        merchant_id: service.id,
        merchant_name: service.name,
        payment_method: "rozo_wallet",
        amount_usd: usdAmount,
        order_id: merchantOrderId,
      });

      const { amount, receiverAddressContract, receiverMemoContract } =
        await generateBridgeAddress(usdAmount);

      const result = await rozoWalletTransfer(
        amount,
        receiverAddressContract,
        receiverMemoContract,
      );

      if (result.hash) {
        // Store receipt data
        const receiptData = {
          from_address: rozoWalletAddress || "",
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

        console.log(
          "[AI Services] Pay with Rozo Wallet - About to save receipt:",
          {
            merchantOrderId,
            receiptData,
          },
        );
        savePaymentReceipt(merchantOrderId, receiptData);
        console.log(
          "[AI Services] Pay with Rozo Wallet - Receipt saved, navigating to /receipt?payment_id=" +
            merchantOrderId,
        );

        capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
          merchant_id: service.id,
          merchant_name: service.name,
          payment_method: "rozo_wallet",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
        });

        toast.success(`Payment successful to ${service.name}!`);
        router.push(`/receipt?payment_id=${merchantOrderId}`);
      }
    } catch (error: unknown) {
      console.error("Rozo Wallet payment error:", error);

      if (isUserCancellation(error)) {
        capture(PAYMENT_EVENTS.PAYMENT_CANCELLED, {
          merchant_id: service.id,
          merchant_name: service.name,
          payment_method: "rozo_wallet",
        });
        toast.error("Payment cancelled");
        return;
      }

      const errorMessage = isRozoProviderError(error)
        ? formatRozoErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Payment failed. Please try again.";

      capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
        merchant_id: service.id,
        merchant_name: service.name,
        payment_method: "rozo_wallet",
        error_message: errorMessage,
      });

      if (isRozoProviderError(error)) {
        toast.error(formatRozoErrorMessage(error));
        return;
      }

      toast.error(errorMessage);
    } finally {
      setIsRozoWalletPaymentLoading(false);
    }
  };

  if (!isRozoWalletAvailable || !isRozoWalletConnected) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Balance Display */}
      {rozoWalletBalance && (
        <p className="text-xs text-muted-foreground text-center">
          Rozo Wallet Balance: {rozoWalletBalance} (Stellar)
        </p>
      )}

      {/* Pay with Rozo Wallet Button */}
      <Button
        variant="default"
        className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
        onClick={handlePayWithRozoWallet}
        disabled={isRozoWalletPaymentLoading}
        size="lg"
      >
        {isRozoWalletPaymentLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Pay {hasPrice ? `$${service.price_usd}` : "N/A"} with Rozo Wallet
          </>
        )}
      </Button>
    </div>
  );
}
