"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getRestaurantByHandle } from "@/lib/restaurants";
import { Loader2 } from "lucide-react";
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
      const timer = setTimeout(() => router.replace("/discovery"), 2500);
      return () => clearTimeout(timer);
    }
  }, [restaurant, router]);

  if (!restaurant) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground mb-3" />
            <p className="text-foreground font-medium mb-1">
              This merchant might be offline
            </p>
            <p className="text-muted-foreground text-sm">
              Taking you to Discovery…
            </p>
          </CardContent>
        </Card>
      </div>
    );
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
