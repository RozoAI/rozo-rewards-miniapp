"use client";

import { RestaurantDappPayment } from "@/components/restaurant/restaurant-dapp-payment";
import { RestaurantDetailBase } from "@/components/restaurant/restaurant-detail-base";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { GLOBAL_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { Restaurant } from "@/types/restaurant";
import React from "react";

export interface RestaurantDappDetailProps {
  restaurant: Restaurant;
  onBack?: () => void;
}

export function RestaurantDappDetail({
  restaurant,
  onBack,
}: RestaurantDappDetailProps) {
  const { walletAddress: rozoWalletAddress } = useRozoWallet();

  const [paymentAmount, setPaymentAmount] = React.useState<string>(() => {
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

  const handleShare = async () => {
    const text = `Check out ${restaurant?.name} at ${
      restaurant?.address_line1
    }!${
      restaurant?.cashback_rate
        ? ` Get ${restaurant.cashback_rate}% cashback!`
        : ""
    }`;

    try {
      await navigator.share({ title: text, url: window.location.href });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error sharing: ${err}`);
      capture(GLOBAL_EVENTS.ERROR_OCCURRED, {
        error_message: message,
        error_context: "share",
      });
    }
  };

  return (
    <RestaurantDetailBase
      restaurant={restaurant}
      mode="dapp"
      rozoWalletAddress={rozoWalletAddress || ""}
      paymentAmount={paymentAmount}
      onAmountChange={setPaymentAmount}
      onShare={handleShare}
      onBack={onBack}
      paymentSlot={
        <RestaurantDappPayment
          restaurant={restaurant}
          paymentAmount={paymentAmount}
          appId={appId}
          merchantOrderId={merchantOrderId}
        />
      }
    />
  );
}
