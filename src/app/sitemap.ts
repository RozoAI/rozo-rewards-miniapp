import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllRestaurants } from "@/lib/restaurants";
import { getAllAiServices } from "@/lib/ai-services";

// Static + data-driven sitemap for the public discovery surfaces. Restaurants
// are already filtered to exclude hidden merchants (see lib/restaurants), so
// only live, shareable pages are listed. Private/transactional routes are
// omitted here and disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/ns`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/discovery`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ai-services`, changeFrequency: "daily", priority: 0.8 },
  ];

  const restaurantRoutes: MetadataRoute.Sitemap = getAllRestaurants().map(
    (r) => ({
      url: `${SITE_URL}/ns/${(r as { handle: string }).handle}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const aiServiceRoutes: MetadataRoute.Sitemap = getAllAiServices().map((s) => ({
    url: `${SITE_URL}/ai-services/${(s as { id: string }).id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...restaurantRoutes, ...aiServiceRoutes];
}
