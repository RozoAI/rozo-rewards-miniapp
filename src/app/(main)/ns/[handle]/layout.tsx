import { RozoPayClientWrapper } from "@/components/rozo-pay-client-wrapper";
import { createMiniAppMetadata } from "@/lib/miniapp-embed";
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

  const title = restaurant
    ? `${restaurant.name} — Restaurant`
    : "Restaurant Details";

  const addressParts = [restaurant?.address_line1, restaurant?.address_line2]
    .filter(Boolean)
    .join(", ");

  const priceInfo = restaurant?.price ? ` • ${restaurant.price}` : "";
  const cashbackInfo =
    restaurant?.cashback_rate && restaurant.cashback_rate > 0
      ? ` • ${restaurant.cashback_rate}% cashback`
      : "";

  const description = restaurant
    ? `${addressParts}${priceInfo}${cashbackInfo}`
    : "View restaurant details, address and pay with crypto.";

  return createMiniAppMetadata(
    {
      imageUrl:
        restaurant?.logo_url ||
        process.env.NEXT_PUBLIC_APP_HERO_IMAGE ||
        "/logo.png",
      bannerUrl: `${process.env.NEXT_PUBLIC_URL}/banner.png`,
      buttonTitle: restaurant
        ? `🍽️ Visit ${restaurant.name}`
        : "🍽️ View Restaurant",
      name: restaurant ? restaurant.name : "Restaurant Details",
      url: `${process.env.NEXT_PUBLIC_URL}/ns/${handle}`,
    },
    {
      title,
      description,
      openGraph: {
        title: restaurant?.name,
        description,
      },
      alternates: {
        canonical: `/ns/${handle}`,
      },
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
    },
  );
}

export default function RestaurantDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RozoPayClientWrapper>
      <div className="relative w-full">
        {children}
        <Suspense fallback={null}>
          <FabActionsOrNothing />
        </Suspense>
      </div>
    </RozoPayClientWrapper>
  );
}
