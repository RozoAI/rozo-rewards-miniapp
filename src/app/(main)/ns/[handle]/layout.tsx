import { getRestaurantByHandle } from "@/lib/restaurants";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FabActionsOrNothing } from "./fab-actions-or-nothing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const restaurant = await getRestaurantByHandle(handle);

  const title = restaurant ? `${restaurant.name} — Restaurant` : "Restaurant Details";

  const addressParts = [restaurant?.address_line1, restaurant?.address_line2]
    .filter(Boolean)
    .join(", ");

  const priceInfo = restaurant?.price ? ` • ${restaurant.price}` : "";
  const cashbackInfo =
    restaurant?.cashback_rate && restaurant.cashback_rate > 0
      ? ` • ${restaurant.cashback_rate}% Cashback`
      : "";

  const description = restaurant
    ? `${addressParts}${priceInfo}${cashbackInfo}`
    : "View restaurant details, address and pay with crypto.";

  const ogImages = restaurant?.logo_url ? [restaurant.logo_url] : undefined;

  return {
    title,
    description,
    openGraph: {
      title: restaurant?.name,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: restaurant?.name,
      description,
      images: ogImages,
    },
    alternates: { canonical: `/ns/${handle}` },
    other: restaurant
      ? {
          "restaurant:name": restaurant.name,
          "restaurant:address": addressParts,
          "restaurant:price": restaurant.price || "",
          "restaurant:cashback_rate": restaurant.cashback_rate.toString(),
          "geo:latitude": restaurant.lat.toString(),
          "geo:longitude": restaurant.lon.toString(),
        }
      : undefined,
  };
}

export default function RestaurantDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full">
      {children}
      <Suspense fallback={null}>
        <FabActionsOrNothing />
      </Suspense>
    </div>
  );
}
