"use client";

import { RestaurantDappDetail } from "@/components/restaurant/restaurant-dapp-detail";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { installMockRozoWallet } from "@/lib/mock-rozo-wallet";
import { getRestaurantById } from "@/lib/restaurants";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";

export default function DappRestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  installMockRozoWallet();

  const { isAvailable, isConnected, isChecking } = useRozoWallet();

  const restaurant = React.useMemo(
    () => getRestaurantById(restaurantId),
    [restaurantId],
  );

  useEffect(() => {
    if (isChecking) return;
    if (!isAvailable || !isConnected) {
      router.replace(`/restaurant/${restaurantId}`);
    }
  }, [isChecking, isAvailable, isConnected, restaurantId, router]);

  if (!restaurant || isChecking || !isAvailable || !isConnected) {
    return null;
  }

  return <RestaurantDappDetail restaurant={restaurant} />;
}
