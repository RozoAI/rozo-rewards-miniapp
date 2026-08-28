import { DiscoverContent } from "@/components/dapp/discover-content";
import { getAllRestaurants } from "@/lib/restaurants";
import { Suspense } from "react";

export default function DiscoverPage() {
  const restaurants = getAllRestaurants();

  return (
    <Suspense>
      <DiscoverContent restaurants={restaurants} />
    </Suspense>
  );
}
