"use client";

import { RestaurantDetailBase } from "@/components/restaurant/restaurant-detail-base";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { type PaymentResponse } from "@rozoai/intent-common";
import { Restaurant } from "@/types/restaurant";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { RozoPayProvider } from "@rozoai/intent-pay";

const RestaurantDiscoveryPayment = dynamic(
  () =>
    import("@/components/restaurant/restaurant-discovery-payment").then(
      (m) => m.RestaurantDiscoveryPayment,
    ),
  { ssr: false },
);

export interface RestaurantDiscoveryDetailProps {
  restaurant: Restaurant;
  onBack?: () => void;
  prefilledPayment?: PaymentResponse | null;
}

export function RestaurantDiscoveryDetail({
  restaurant,
  onBack,
  prefilledPayment,
}: RestaurantDiscoveryDetailProps) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>(() => {
    // Use prefilled amount from payment link if available (strip trailing zeros)
    if (prefilledPayment?.metadata?.amount_local) {
      return String(parseFloat(prefilledPayment.metadata.amount_local));
    }
    if (prefilledPayment?.source?.amount) {
      return String(parseFloat(prefilledPayment.source.amount));
    }
    const price =
      restaurant?.price && !isNaN(Number(restaurant.price))
        ? Number(restaurant.price)
        : 0;
    return price > 0 ? price.toFixed(2) : "";
  });

  const [appId] = React.useState<string>(
    () => `rozoRewardsBNBStellarMP-${restaurant?.handle || ""}`,
  );

  const [merchantOrderId] = React.useState<string>(
    `${restaurant?.handle.toUpperCase()}-${new Date().getTime()}`,
  );
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const toAddress = useMemo(() => {
    return restaurant?.payTo ?? "0x2352Fa2970dBadD12d21808DB0F56CDEC8141739";
  }, [restaurant]);

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

  useEffect(() => {
    if (!restaurant) return;
    router.prefetch("/receipt");
  }, [restaurant, router]);

  const handleShare = () => {
    // No location / cashback in share copy (owner 2026-07-17).
    const text = `Check out ${restaurant?.name} on Rozo!`;

    (async () => {
      try {
        await navigator.share({ title: text, url: window.location.href });
      } catch (err) {
        console.error(`Error sharing: ${err}`);
      }
    })();
  };

  return (
    <RozoPayProvider>
      <RestaurantDetailBase
        restaurant={restaurant}
        mode="discovery"
        paymentAmount={paymentAmount}
        onAmountChange={setPaymentAmount}
        onShare={handleShare}
        onBack={onBack}
        paymentSlot={
          <RestaurantDiscoveryPayment
            restaurant={restaurant}
            paymentAmount={paymentAmount}
            appId={appId}
            merchantOrderId={merchantOrderId}
            toAddress={toAddress}
            generateMetadata={generateMetadata}
            loading={loading}
            setLoading={setLoading}
            prefilledPayment={prefilledPayment}
          />
        }
      />
    </RozoPayProvider>
  );
}
