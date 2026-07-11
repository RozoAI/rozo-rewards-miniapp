"use client";

import { getRestaurantByHandle } from "@/lib/restaurants";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

const RestaurantDappDetail = dynamic(
  () => import("@/components/restaurant/restaurant-dapp-detail").then((m) => ({ default: m.RestaurantDappDetail })),
  { ssr: false },
);

const RestaurantDiscoveryDetail = dynamic(
  () => import("@/components/restaurant/restaurant-discovery-detail").then((m) => ({ default: m.RestaurantDiscoveryDetail })),
  { ssr: false },
);

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;
  const [isRozoWallet, setIsRozoWallet] = useState(false);

  useEffect(() => {
    setIsRozoWallet(typeof window !== "undefined" && !!window.rozo);
  }, []);

  const restaurant = React.useMemo(
    () => getRestaurantByHandle(handle),
    [handle],
  );

  useEffect(() => {
    if (!restaurant) {
      router.replace("/discovery");
    }
  }, [restaurant, router]);

  if (!restaurant) {
    return null;
  }

  if (isRozoWallet) {
    return (
      <RestaurantDappDetail
        restaurant={restaurant}
        onBack={() => router.push("/dapp")}
      />
    );
  }

  return (
    <RestaurantDiscoveryDetail
      restaurant={restaurant}
      onBack={() => router.push("/discovery")}
    />
  );
}
