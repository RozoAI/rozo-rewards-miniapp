"use client";

import { RestaurantDappDetail } from "@/components/restaurant/restaurant-dapp-detail";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { GLOBAL_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { getRestaurantById } from "@/lib/restaurants";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function DappRestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  const { isAvailable, isConnected, isChecking } = useRozoWallet();

  const restaurant = React.useMemo(
    () => getRestaurantById(restaurantId),
    [restaurantId],
  );

  useEffect(() => {
    if (isChecking) return;
    if (!isAvailable || !isConnected) {
      capture(GLOBAL_EVENTS.ERROR_OCCURRED, {
        error_message: "Rozo Wallet not available or not connected",
        error_context: "wallet_not_available",
      });
      router.replace(`/ns/${restaurant?.handle ?? restaurantId}`);
    }
  }, [isChecking, isAvailable, isConnected, restaurantId, router]);

  useEffect(() => {
    if (!restaurant || isChecking || !isAvailable || !isConnected) return;
    capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
      merchant_id: restaurant._id,
      merchant_name: restaurant.name,
      category: "network_schools",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?._id]);

  if (!restaurant || isChecking || !isAvailable || !isConnected) {
    return null;
  }

  return <RestaurantDappDetail restaurant={restaurant} />;
}
