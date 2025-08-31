import { FabActions } from "@/components/fab-actions";
import { createMiniAppMetadata } from "@/lib/miniapp-embed";
import { Restaurant } from "@/types/restaurant";
import type { Metadata } from "next";

type CoffeeMapResponse = {
  locations: Restaurant[];
  status?: string;
};

async function getRestaurant(id: string): Promise<Restaurant | null> {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/coffee_mapdata.json`, {
      // Allow caching but keep it reasonably fresh
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CoffeeMapResponse;
    if (!data || !Array.isArray(data.locations)) return null;
    return data.locations.find((l) => l._id === id) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurant(id);

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
      buttonTitle: restaurant
        ? `🍽️ Visit ${restaurant.name}`
        : "🍽️ View Restaurant",
      name: restaurant ? restaurant.name : "Restaurant Details",
      url: `${process.env.NEXT_PUBLIC_URL}/restaurant/${id}`,
    },
    {
      title,
      description,
      alternates: {
        canonical: `/restaurant/${id}`,
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
    }
  );
}

export default function RestaurantDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      {children}
      <FabActions className="fixed" />
    </div>
  );
}
