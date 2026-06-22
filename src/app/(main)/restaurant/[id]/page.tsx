"use client";

import { PageHeader } from "@/components/page-header";
import { RestaurantDiscoveryDetail } from "@/components/restaurant/restaurant-discovery-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRestaurantById } from "@/lib/restaurants";
import { useParams, useRouter } from "next/navigation";
import React from "react";

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  const restaurant = React.useMemo(
    () => getRestaurantById(restaurantId),
    [restaurantId],
  );

  if (!restaurant) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="Back to Discovery" isBackButton />
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive text-lg font-medium mb-2">
              Restaurant not found
            </p>
            <p className="text-muted-foreground mb-4">
              The restaurant you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button onClick={() => router.push("/discovery")} variant="outline">
              Back to Discovery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <RestaurantDiscoveryDetail restaurant={restaurant} />;
}
