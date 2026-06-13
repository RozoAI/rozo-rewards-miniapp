"use client";

import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import {
  formatRozoErrorMessage,
  isRozoProviderError,
  isUserCancellation,
} from "@/lib/rozo-errors";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { savePaymentReceipt } from "@/lib/payment-storage";
import { Restaurant } from "@/types/restaurant";
import { PaymentData } from "@/app/receipt/receipt-content";
import {
  baseUSDC,
  createPayment,
  rozoStellarUSDC,
} from "@rozoai/intent-common";
import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface RestaurantDappPaymentProps {
  restaurant: Restaurant;
  paymentAmount: string;
  appId: string;
  merchantOrderId: string;
}

export function RestaurantDappPayment({
  restaurant,
  paymentAmount,
  appId,
  merchantOrderId,
}: RestaurantDappPaymentProps) {
  const router = useRouter();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
    walletAddress: rozoWalletAddress,
    balance: rozoWalletBalance,
    balanceUsd: rozoWalletBalanceUsd,
    isLoading: rozoWalletLoading,
    transferUSDC: rozoWalletTransfer,
  } = useRozoWallet();

  const [isRozoWalletPaymentLoading, setIsRozoWalletPaymentLoading] =
    React.useState(false);

  const toAddress = React.useMemo(() => {
    return restaurant?.payTo ?? "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";
  }, [restaurant]);

  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const generateMetadata = (amountLocal: string, currencyLocal: string) => {
    const displayCurrency = getDisplayCurrency(currencyLocal);
    const usdAmount = convertToUSD(amountLocal, displayCurrency);

    const baseMetadata = {
      amount_local: amountLocal,
      currency_local: displayCurrency,
      items: [
        {
          name: restaurant?.name,
          description: `${displayCurrency} ${amountLocal} (${usdAmount} USD)`,
        },
      ],
    };

    if (restaurant?.handle && restaurant?.name) {
      return {
        ...baseMetadata,
        merchant_order_id: merchantOrderId,
        ...(restaurant?.is_live ? { receiptUrl: receiptUrl } : {}),
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
  const generateBridgeAddress = async (params: {
    amountUsd: string;
    amountLocal: string;
    currencyLocal: string;
  }): Promise<{
    amount: string;
    bridgeAddress: string;
    memo: string;
    receiverAddressContract?: string;
    receiverMemoContract?: string;
  }> => {
    const displayCurrency = getDisplayCurrency(params.currencyLocal);

    const payment = await createPayment({
      appId: appId,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
      toUnits: params.amountUsd,
      preferredChain: rozoStellarUSDC.chainId,
      preferredTokenAddress: rozoStellarUSDC.token,
      metadata: generateMetadata(params.amountLocal, displayCurrency) as any,
      title: `Pay for ${restaurant?.name} - ${displayCurrency} ${params.amountLocal} ($${params.amountUsd})`,
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
    if (!restaurant || !paymentAmount) return;

    try {
      setIsRozoWalletPaymentLoading(true);

      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      // Transfer USDC on Stellar network
      const { amount, receiverAddressContract, receiverMemoContract } =
        await generateBridgeAddress({
          amountUsd: usdAmount,
          amountLocal: paymentAmount,
          currencyLocal: displayCurrency,
        });

      const result = await rozoWalletTransfer(
        amount,
        receiverAddressContract,
        receiverMemoContract,
      );

      if (result.hash) {
        // Store receipt data
        const receiptData: PaymentData = {
          from_address: rozoWalletAddress || "",
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
        };

        console.log(
          "[Restaurant] Pay with Rozo Wallet - About to save receipt:",
          {
            merchantOrderId,
            receiptData,
          },
        );
        savePaymentReceipt(merchantOrderId, receiptData);
        console.log(
          "[Restaurant] Pay with Rozo Wallet - Receipt saved, navigating to /receipt?payment_id=" +
            merchantOrderId +
            "&withRozoWallet=true",
        );

        toast.success(`Payment successful to ${restaurant.name}!`);
        router.push(
          `/receipt?payment_id=${merchantOrderId}&withRozoWallet=true`,
        );
      }
    } catch (error: unknown) {
      console.error("Rozo Wallet payment error:", error);

      if (isUserCancellation(error)) {
        toast.error("Payment cancelled");
        return;
      }

      if (isRozoProviderError(error)) {
        toast.error(formatRozoErrorMessage(error));
        return;
      }

      const fallback =
        error instanceof Error
          ? error.message
          : "Payment failed. Please try again.";
      toast.error(fallback);
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
          Rozo Wallet Balance: {rozoWalletBalance}
        </p>
      )}

      {/* Pay with Rozo Wallet Button */}
      <Button
        variant="default"
        className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
        onClick={handlePayWithRozoWallet}
        disabled={
          isRozoWalletPaymentLoading ||
          !paymentAmount ||
          parseFloat(paymentAmount) <= 0 ||
          isNaN(parseFloat(paymentAmount)) ||
          rozoWalletLoading ||
          (rozoWalletBalanceUsd !== null && rozoWalletBalanceUsd <= 0)
        }
        size="lg"
      >
        {isRozoWalletPaymentLoading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        )}
        {rozoWalletBalanceUsd !== null && rozoWalletBalanceUsd > 0 ? (
          <>
            Pay $
            {isNaN(
              parseFloat(
                convertToUSD(
                  paymentAmount || "0",
                  getDisplayCurrency(restaurant?.currency),
                ),
              ),
            )
              ? "0.00"
              : convertToUSD(
                  paymentAmount || "0",
                  getDisplayCurrency(restaurant?.currency),
                )}{" "}
            with Rozo Wallet
          </>
        ) : (
          "Insufficient Rozo Wallet Balance"
        )}
      </Button>
    </div>
  );
}
