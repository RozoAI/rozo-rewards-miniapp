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

  // Branded share title: "NS Cafe @ Network School | ROZO"
  const title = restaurant
    ? `${restaurant.name} @ Network School | ROZO`
    : "Restaurant Details | ROZO";

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

  // OG image is provided by the sibling opengraph-image.tsx (branded centered
  // card). Don't set openGraph/twitter images here or it overrides the file
  // convention with the bare merchant logo.
  const ogTitle = restaurant
    ? `${restaurant.name} @ Network School`
    : "Restaurant Details";

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
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
