"use client";

import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { createMerchantPayment } from "@/lib/api";
import { savePaymentReceipt, type PaymentData } from "@/lib/payment-storage";
import {
  errorToString,
  formatRozoErrorMessage,
  isUserCancellation,
} from "@/lib/rozo-errors";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { updatePaymentPayInTxHash } from "@rozoai/intent-common";
import { Loader2 } from "lucide-react";
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
    activeCurrency: rozoActiveCurrency,
    isLoading: rozoWalletLoading,
    transferUSDC: rozoWalletTransfer,
  } = useRozoWallet();

  const [isCreatingPayment, setIsCreatingPayment] = React.useState(false);
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [confirmedAmount, setConfirmedAmount] = React.useState<string | null>(null);

  const toAddress = React.useMemo(() => {
    return restaurant?.payTo ?? "0x2352Fa2970dBadD12d21808DB0F56CDEC8141739";
  }, [restaurant]);

  const displayCurrency = React.useMemo(
    () => getDisplayCurrency(restaurant?.currency),
    [restaurant?.currency],
  );

  const usdAmount = React.useMemo(
    () => convertToUSD(paymentAmount || "0", displayCurrency),
    [paymentAmount, displayCurrency],
  );

  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const generateMetadata = (amountLocal: string) => {
    const localUsdAmount = convertToUSD(amountLocal, displayCurrency);

    const baseMetadata = {
      amount_local: amountLocal,
      currency_local: displayCurrency,
      items: [
        {
          name: restaurant?.name,
          description: `${displayCurrency} ${amountLocal} (${localUsdAmount} USD)`,
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
  const generateBridgeAddress = async (): Promise<{
    paymentId: string;
    amount: string;
    receiverAddressContract?: string;
    receiverMemoContract?: string;
  }> => {
    const payment = await createMerchantPayment({
      appId: appId,
      amount_local: paymentAmount,
      currency_local: displayCurrency,
      source: { chainId: "1500", tokenSymbol: "USDC" },
    });

    if (
      !payment.source.receiverAddressContract ||
      !payment.source.receiverMemoContract ||
      !payment.source.amount
    ) {
      throw new Error("Failed to generate payment");
    }

    return {
      paymentId: payment.id,
      amount: payment.source.amount,
      receiverAddressContract: payment.source.receiverAddressContract,
      receiverMemoContract: payment.source.receiverMemoContract,
    };
  };

  const handlePayWithRozoWallet = async () => {
    if (!restaurant || !paymentAmount || !rozoWalletAddress) return;

    try {
      setIsCreatingPayment(true);

      capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "rozo_wallet",
      });

      let bridgeResult: Awaited<ReturnType<typeof generateBridgeAddress>>;
      try {
        bridgeResult = await generateBridgeAddress();
      } catch (bridgeError: unknown) {
        const errorMessage =
          bridgeError instanceof Error
            ? bridgeError.message
            : "Failed to generate bridge address";
        capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "rozo_wallet",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
          error_message: errorMessage,
          error_context: "bridge_address",
        });
        toast.error(errorMessage);
        return;
      }

      capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "rozo_wallet",
        amount_usd: usdAmount,
        order_id: merchantOrderId,
      });

      setIsCreatingPayment(false);
      setIsTransferring(true);

      const {
        paymentId,
        amount,
        receiverAddressContract,
        receiverMemoContract,
      } = bridgeResult;

      setConfirmedAmount(amount);

      const result = await rozoWalletTransfer(
        amount,
        receiverAddressContract,
        receiverMemoContract,
        paymentId,
      );

      if (result.status === "FAILED") {
        console.error("[rozoWallet] transfer failed:", result.error);
        const msg = formatRozoErrorMessage(result.error);
        capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "rozo_wallet",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
          error_message: result.error,
          error_context: "transfer_failed_status",
        });
        toast.error(msg);
        return;
      }

      if (result.hash) {
        updatePaymentPayInTxHash({
          paymentId,
          txHash: result.hash,
          senderAddress: rozoWalletAddress,
        }).catch((e) => {
          console.log(e);
          capture(PAYMENT_EVENTS.PAYMENT_TX_HASH_IN_FAILED, {
            merchant_id: restaurant._id,
            merchant_name: restaurant.name,
            payment_method: "rozo_wallet",
            amount_usd: usdAmount,
            order_id: paymentId,
          });
        });

        // Store receipt data
        const receiptData: PaymentData = {
          from_address: rozoWalletAddress,
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
          payment_id: paymentId,
        };

        savePaymentReceipt(merchantOrderId, receiptData);

        capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "rozo_wallet",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
        });

        toast.success(`Payment successful to ${restaurant.name}!`);
        router.push(
          `/receipt?payment_id=${merchantOrderId}&withRozoWallet=true`,
        );
      } else {
        capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "rozo_wallet",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
          error_message: "Transfer completed but no transaction hash returned",
          error_context: "missing_tx_hash",
        });
        toast.error("Payment failed. No transaction hash received.");
      }
    } catch (error: unknown) {
      console.error("Rozo Wallet payment error:", error);

      if (isUserCancellation(error)) {
        capture(PAYMENT_EVENTS.PAYMENT_CANCELLED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "rozo_wallet",
        });
        toast.error("Payment cancelled");
        return;
      }

      const errorMessage = formatRozoErrorMessage(errorToString(error));

      capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "rozo_wallet",
        error_message: errorToString(error),
      });

      toast.error(errorMessage);
    } finally {
      setIsCreatingPayment(false);
      setIsTransferring(false);
    }
  };

  if (!isRozoWalletAvailable || !isRozoWalletConnected) {
    return null;
  }

  const isEurcActive = rozoActiveCurrency === "EURC";

  return (
    <div className="space-y-2">
      {/* Balance Display */}
      {rozoWalletBalance && (
        <p className="text-xs text-muted-foreground text-center">
          Balance: {rozoWalletBalance}
        </p>
      )}

      {/* EURC notice */}
      {isEurcActive && (
        <p className="text-xs text-warning text-center">
          Switch to USDC in your Rozo Wallet to pay.
        </p>
      )}

      {/* Pay with Rozo Wallet Button */}
      <Button
        variant="default"
        className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
        onClick={handlePayWithRozoWallet}
        disabled={
          isEurcActive ||
          isCreatingPayment ||
          isTransferring ||
          !paymentAmount ||
          parseFloat(paymentAmount) <= 0 ||
          isNaN(parseFloat(paymentAmount)) ||
          rozoWalletLoading ||
          (rozoWalletBalanceUsd !== null && rozoWalletBalanceUsd <= 0)
        }
        size="lg"
      >
        {isCreatingPayment || isTransferring || rozoWalletLoading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {isCreatingPayment
          ? "Creating Payment..."
          : isTransferring
            ? "Processing Payment..."
            : rozoWalletLoading
              ? "Loading..."
              : rozoWalletBalanceUsd !== null && rozoWalletBalanceUsd > 0
                ? `Pay $${confirmedAmount ?? (isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount)}`
                : "Insufficient Balance"}
      </Button>
    </div>
  );
}
