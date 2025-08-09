import { createMiniAppMetadata } from "@/lib/miniapp-embed";
import type { Metadata } from "next";

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
};

type CoffeeMapResponse = {
  locations: LocationItem[];
  status?: string;
};

async function getRestaurant(id: string): Promise<LocationItem | null> {
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
  const description = restaurant
    ? `${restaurant.address_line1}${
        restaurant.address_line2 ? `, ${restaurant.address_line2}` : ""
      }`
    : "View restaurant details, address and pay with crypto.";

  const urlPath = `/restaurant/${id}`;
  const fullUrl = `${process.env.NEXT_PUBLIC_URL}${urlPath}`;

  return createMiniAppMetadata(
    {
      imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
      buttonTitle: restaurant
        ? `🍽️ Visit ${restaurant.name}`
        : "🍽️ View Restaurant",
      name: restaurant ? restaurant.name : "Restaurant Details",
      url: fullUrl,
    },
    {
      title,
      description,
      openGraph: {
        title,
        description,
        url: urlPath,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: urlPath,
      },
    }
  );
}

export default function RestaurantDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
